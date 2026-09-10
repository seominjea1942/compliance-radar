# Devpost submission — Compliance Radar (revised, first person)

## Inspiration

Small business owners usually do not get blindsided by the regulations they
already know about. They get blindsided by a consent-calendar line item, a
recall notice that never reached them, or a fee that quietly appears on a
property tax bill.

The owner of an 18-employee grocery store cannot realistically read the FDA
enforcement feed, the USDA recall list, 70 council agenda items per meeting,
and every permit filed near the store. So most owners do not, and the anxiety
of missing something never goes away.

I built the radar for one of the hardest cases first: an independent grocery
store with a deli counter. Grocery stores operate under several overlapping
regulators, which makes them a good test case for the problem.

## What it does

Every morning, a Strands agent running on Amazon Bedrock AgentCore reads five
real data sources: openFDA enforcement data, FDA recall press releases, USDA
FSIS recall emails, San Jose city council agendas including the staff-report
PDFs behind consent items, and street-work permits near the store.

The agent triages every item against a detailed profile of one specific
store. The profile includes what the store carries down to the brand level,
its street address, headcount, and licenses.

Silence is the product. Across 90 days of real data, the radar reviewed more
than 640 items and surfaced only a handful.

Its signature feature is the rejection log. The log shows every item the
radar chose not to interrupt the owner about, along with a one-line reason
such as "Sold exclusively at Albertsons," "Distributed only to OR and WA," or
"City payroll classification, not private wage law."

The owner can overturn any rejection. That correction becomes retrieved
context for future triage decisions.

A chat panel called "Ask the radar" lets the owner ask questions such as
"Why did this reach me?" The agent answers by using tools over the same live
database. Every surfaced item can also be turned into a plain-text brief
that the owner can forward to an accountant or lawyer.

The system has already found several real issues in real data, and each one
maps to money or liability the owner would otherwise absorb without warning:

- It caught a Class II metal-contamination recall involving five Straus
  Family Creamery flavors that the store actually carries. This matters
  because the recalled pints could be sitting in the freezer case being sold
  right now: selling recalled product exposes a store to customer harm and
  real enforcement (California district attorneys settled a $1.6M case
  against a regional grocer over exactly this class of shelf-management
  failure), and nobody calls a small store to tell them. The radar named the
  exact flavors, UPCs, and best-by dates to pull.
- It found a sewer-rate hearing involving about $242 million in county
  property tax charges. This matters because commercial sewer charges are
  rate-classed, and a store with a deli that prepares hot food falls into a
  higher-strength class: the outcome of that one hearing lands directly on
  the store's property tax bill as a line item most owners only discover
  after it is already final.
- It found a one-year rescheduling of utility trenching on the store's own
  street, buried on page 2 of a staff report attached to a consent item
  titled "Rule 20A and Rule 20B (In-Lieu Fee) Underground Utility Program."
  For a store with a small lot and front-door deliveries, street trenching
  is a survival issue, and a keyword search would never have connected that
  title to this street.

Midway through the build, the radar caught a live recall expansion for
Everything Sprouts' Robust Radish Mix and emailed the owner at 6 AM on a
Saturday with nobody watching the system.

## How I built it

The system runs one Strands agent with two modes on a single AgentCore
Runtime.

In batch mode, EventBridge Scheduler triggers Lambda, which calls
InvokeAgentRuntime and starts the daily triage loop. The system fetches each
item, creates an embedding with Titan V2, retrieves similar past decisions
through TiDB vector search, asks Claude Haiku 4.5 to make a decision, and
writes the decision and reason back to the database.

In interactive mode, the web app calls the same runtime using AgentCore
session IDs. A Strands agent uses five database tools for decision lookup,
filtered logs, open items, resolution history, and semantic search. It
answers the owner's questions while keeping memory bounded to the current
session.

Council items use a two-stage triage process. The system first performs a
low-cost title triage. If an item survives that step, the agent reads the
staff-report PDF in detail and extracts important dates, supporting
evidence, and the page number where that evidence appears.

TiDB Cloud Serverless stores the product state. It stores source documents,
every triage decision and its reason, embeddings, the rejection log,
resolutions, overturns, and the store profile that the UI edits live.

I deliberately did not use AgentCore Memory for this data. The rejection log
and store profile are auditable product data. The UI needs to query them
through SQL, the vector search needs to retrieve them, and the owner needs
to be able to overturn individual decisions row by row. A database is the
right place for that state. I use session-scoped agent state for
conversational context instead.

The frontend runs on Next.js and Vercel. It reads TiDB through database
views using the serverless HTTP driver. The application uses one
least-privilege AWS key, and that key only has permission to invoke the
runtime.

## Challenges I ran into

The USDA FSIS recall API is blocked by bot protection at the network edge,
including its own documentation page. I worked around this by subscribing to
FSIS's official GovDelivery emails and building an SES inbound pipeline that
stores the emails in S3 and parses them. The agent now reads the same recall
announcement that a human subscriber receives.

I also learned that openFDA is better treated as an archive than an alert
feed. Its data can lag by 11 to 80 days. I therefore use FDA press-release
RSS for freshness and openFDA for structured enrichment.

San Jose's Legistar data created another issue. Its consent flag is
populated as zero for every item, so the field cannot be trusted to identify
consent-calendar items.

The city's permit data had a similar semantic trap. A permit with an
"Accepted" status sounds like it has been approved and may be upcoming, but
my validation showed that it actually means the work was completed. I
confirmed this by sampling 85 permits, and all 85 had final dates.

I found both problems because I validated each source against real records
before building the product around it.

I also learned a $30 lesson about reusing a stateful chat agent inside a
batch loop. Conversation history accumulated across items and increased my
token usage by about 25 times. I fixed the problem by clearing the agent
state after each item.

## Accomplishments I'm proud of

Every number in the demo comes from real data. The system includes 90 days
of genuine backfill, a live recall that it caught and emailed without human
intervention, and a rejection log with reasons that still hold up when
someone audits the underlying source.

The consent-calendar example captures the main idea of the product in one
screen. The radar found that construction on the store's own street had been
rescheduled, even though the relevant detail appeared only on page 2 of a
staff report attached to a broadly titled consent item.

The business persona is also configuration rather than code. The reasoning
engine does not contain grocery-specific logic. If I replace the store
profile with a salon or taqueria profile, the same radar can monitor the
regulations and events relevant to that business.

## What I learned

About Strands: the same agent code serves both modes. Batch triage runs it
as stateless single calls, and the chat panel runs it with tools and session
state. Giving the chat agent five small database tools kept its answers tied
to rows it actually read. The $30 token incident taught me where the
boundary sits: conversation history belongs in a chat session and has no
place in a batch loop.

About AgentCore: session IDs gave per-user conversation continuity without
any session infrastructure on my side, and two-minute CodeZip deploys meant
I could iterate on prompts against production data all week. The other
lesson was deciding which state goes where. Audit records went to TiDB so
that SQL, vector search, and row-level overturns all work; only
conversational context stays with the agent.

About the data: public sources have bot walls, misleading field names, and
archives that look like alert feeds. An agent that reads the underlying
documents beats keyword filters in both directions, finding what vague
titles hide and rejecting what alarming titles inflate. And owners trust
the silence because the app shows what was reviewed, what was rejected,
and why.

## What's next

I want to add recall-termination-based expiry, learning from alert
dismissals, richer street-work windows, and profiles for additional business
types. There are plenty of stores like this one: U.S. Census data (SUSB
2021) counts about 35,000 grocery firms with fewer than 50 employees, before
counting the salons, restaurants, and other main-street businesses that sit
under the same overlapping regulators.

The core system already generalizes through the business profile. Expanding
to a new type of business should mostly require editing that profile rather
than rebuilding the reasoning engine.
