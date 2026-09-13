# Agents for Humans: one Strands agent, two modes, one AgentCore Runtime, and the $30 lesson in between

I spent the past few weeks building Shopbell for the AWS "Agents for Humans"
hackathon. It is a background compliance agent for one specific small
business: an 18-employee grocery store with a deli counter in San Jose.
Every morning it reads FDA and USDA recall feeds, city council agendas
(including the staff-report PDFs behind consent items), and street-work
permits near the store, and it decides what actually matters to that store.

The product idea is simple to state and surprisingly hard to build well:
silence is the product. In its first two weeks the agent read 773 real
items and surfaced 57 decisions, of which only 8 said "act now." Everything
else went into a rejection log with a one-sentence reason the owner can
audit and overturn.

This post is about the AWS side of that build: how I ran one Strands agent
in two very different modes on a single Amazon Bedrock AgentCore Runtime,
and the mistakes that cost me real money along the way.

## The shape of the system

- **Batch mode.** EventBridge Scheduler fires at 6 AM, invokes a small
  Lambda, and the Lambda calls `InvokeAgentRuntime` with
  `{"action": "daily_run"}`. The agent fetches every source, embeds each new
  item with Titan Text Embeddings V2, retrieves similar past decisions from
  TiDB vector search, asks Claude Haiku 4.5 to triage, and writes the
  decision, its reason, and its embedding back to TiDB.
- **Interactive mode.** The web app calls the same runtime with
  `{"action": "ask", ...}` and an AgentCore `runtimeSessionId`. That path
  runs a Strands agent with five database tools (open items, the filtered
  log, resolution history, a decision lookup, and semantic search) so the
  owner can ask "why did this reach me?" and get an answer grounded in rows
  the agent actually read.

Both modes are the same deployed code. The entry point reads `action` from
the payload and routes. That turned out to be the single best decision in
the project, because every prompt fix, every tool improvement, and every
deploy applied to both experiences at once.

## Why one runtime instead of two

I started with the assumption that a batch job and a chat agent were
different enough to deserve separate deployments. Two things changed my
mind.

First, AgentCore deploys with the CDK CodeZip path took about two minutes.
That is fast enough to iterate on prompts against production data all
week, but only if there is one thing to deploy. Two runtimes would have
doubled the deploy loop and, more importantly, doubled the chance that the
batch triage and the chat agent drifted apart in how they read the store
profile.

Second, the interactive agent needs to see exactly what the batch agent
decided, in the same schema, with the same reasons. Sharing code is the
cheapest way to guarantee that.

## The $30 mistake

Strands agents are stateful by default. That is exactly what you want in a
chat session and exactly what you do not want in a batch loop.

My first backfill reused one `Agent` instance across several hundred items.
The default conversation manager kept prior turns in the context window,
so item 200 was being triaged with the prompts and answers of items 1
through 199 still attached. Input tokens multiplied by roughly 25x. I
noticed when the Bedrock bill jumped by about $30 in an afternoon on a
Haiku-class model.

The fix is one line before each independent call:

```python
agent.messages = []
text = str(agent(prompt))
```

The lesson generalizes: conversation history belongs to a session, and a
batch loop is not a session. In the interactive path I do the opposite on
purpose. Each `runtimeSessionId` gets its own agent with a
`SlidingWindowConversationManager` capped at a dozen turns, cached in a
small LRU so follow-up questions keep their context without growing
forever.

Practical advice: before running any batch job that calls a model in a
loop, estimate the cost from the per-item token count and print it. I now
report the expected spend before every backfill, and I set AWS Budgets
alerts the same day I found the problem.

## Scheduler retries are not your friend for LLM batch jobs

EventBridge Scheduler's default retry policy is generous. When my Lambda
timed out once while the runtime was still working, the scheduler retried
and I ended up with four overlapping daily runs, 84 duplicate decisions,
and a handful of rows with an invalid enum value that the UI could not
render.

Three fixes, all cheap:

1. `MaximumRetryAttempts: 0` on the schedule target. A triage pass that
   already ran should not run again because the caller got impatient.
2. A `UNIQUE(document_id)` constraint on the decisions table, with
   `INSERT ... ON DUPLICATE KEY UPDATE id=id`, so a rerun is idempotent even
   if something upstream misfires.
3. A hard enum guard in the insert path. The model is allowed to say
   `ALERT`, `REJECT`, or `OPPORTUNITY`; anything else is normalized or
   rejected before it touches the database.

I later found the same failure class one layer down: boto3's default
client retry in the Lambda re-invoked the runtime when a long daily run
exceeded the 60-second read timeout. `Config(read_timeout=900,
retries={"total_max_attempts": 1})` on the client closed that door.

## Where state lives, and why not AgentCore Memory

AgentCore Memory is the obvious place to put "what the agent remembers." I
deliberately did not use it for the rejection log or the store profile,
and I think the reasoning is worth spelling out.

The rejection log is product data. The owner reads it in a web UI, filters
it, and overturns individual rows. The vector search that lets an overturn
teach future triage needs to query it by embedding. Those are database
operations, so the log lives in TiDB Cloud Serverless as ordinary SQL
tables with a `VECTOR(1024)` column and views the frontend reads directly.

What stays with the agent is conversational context: the last few turns of
one owner's chat session, keyed by the AgentCore session id. That is the
boundary I would draw again: audit records in a database, conversation in
the agent.

## Two smaller things that helped

- **Session ids have a minimum length.** `runtimeSessionId` must be at
  least 33 characters. My first interactive call failed for that reason
  and the error was not obvious.
- **Use the SDK, not the CLI, to send structured payloads.** The `agentcore
  invoke` CLI wraps the payload in a way that lost my `action` field, so
  everything fell through to the default batch path. `boto3`'s
  `invoke_agent_runtime` sends exactly what you give it.

## What I would tell someone starting today

Put both modes in one runtime and route on a payload field. Clear agent
state between independent batch calls, and budget the run before you start
it. Turn scheduler and client retries off for anything that calls a model
in a loop, and make the write path idempotent so you survive the retry you
forgot to disable. Keep audit data in a real database and let the agent own
only the conversation.

The code is public at https://github.com/seominjea1942/compliance-radar
and the running product is at https://shopbell.minjeaseo.com.
