# Devpost submission draft — Compliance Radar

Paste each section into the Devpost form. Target track: Professional Agents.
Attach: 3-min video link, public repo URL, live app URL
(https://compliance-radar-red.vercel.app), architecture diagram image,
4-6 screenshots (home, event card + Resolve modal, rejection log, map,
Ask panel, profile).

---

## Elevator pitch (short tagline field)

A compliance radar for main street businesses: it reads recall feeds, city
council agendas, and street permits every day, and stays silent unless
something genuinely affects your store — then shows you everything it chose
NOT to say.

## Inspiration

Small business owners don't get blindsided by the regulations they know
about; they get blindsided by a consent-calendar line item, a recall notice
that never reached them, a fee that quietly lands on a property tax bill.
The owner of an 18-employee grocery store cannot read the FDA enforcement
feed, the USDA recall list, 70 council agenda items a meeting, and every
permit filed near their block. So nobody does — and the anxiety of missing
something never goes away. We built the radar for the hardest case first: an
independent grocery with a deli counter, because groceries sit under more
overlapping regulators than any other small business.

## What it does

Every morning, a Strands agent on Amazon Bedrock AgentCore reads five real
data sources — openFDA enforcement, FDA recall press releases, USDA FSIS
recall emails, San Jose city council agendas (including the staff-report
PDFs behind consent items), and street-work permits near the store — and
triages every item against a deep profile of one specific store: what it
carries down to the brand level, its street, its headcount, its licenses.

Silence is the product. In 90 days of real data, the radar reviewed 640+
items and surfaced a handful. Its signature feature is the rejection log:
every item it chose NOT to interrupt the owner about, each with a one-line
reason ("Sold exclusively at Albertsons", "Distributed only to OR and WA",
"City payroll classification, not private wage law"). The owner can overturn
any rejection, and that correction feeds future triage as retrieved context.
A chat panel ("Ask the radar") answers questions like "why did this reach
me?" using tools over the same live database, and every surfaced item can be
turned into a forwardable plain-text brief for an accountant or lawyer.

Real catches from real data: a Class II metal-contamination recall of five
Straus Family Creamery flavors the store literally carries; a sewer-rate
hearing that lands ~$242M on county property tax bills, with the deli's
higher rate class; and buried in a consent item titled "Rule 20A and Rule
20B (In-Lieu Fee) Underground Utility Program", a one-year reschedule of
utility trenching on the store's own street — found on page 2 of the staff
report, where no keyword search would ever look. While we were building,
the radar caught a live recall expansion (Everything Sprouts' Robust Radish
Mix) and emailed the owner at 6 AM on a Saturday, unattended.

## How we built it

One Strands agent brain, two modes, on one AgentCore Runtime. Batch mode:
EventBridge Scheduler → Lambda → InvokeAgentRuntime runs the daily triage
loop (fetch, embed with Titan V2, retrieve similar past decisions via TiDB
vector search, decide with Claude Haiku 4.5, write the decision + reason).
Interactive mode: the web app calls the same runtime with AgentCore session
ids; a Strands agent with five database tools (decision lookup, filtered
log, open items, resolution history, semantic search) answers the owner's
questions with bounded per-session memory. Council items get two-stage
triage: cheap title triage, then a staff-report PDF deep-read for survivors
that extracts key dates and an evidence quote with its page number.

State lives in TiDB Cloud Serverless: documents, every triage decision with
its reason and embedding, the rejection log, resolutions, overturns, and the
store profile the UI edits live. We deliberately did NOT use AgentCore
Memory for this: the rejection log and profile are auditable product data
that the UI queries in SQL, the vector search retrieves, and the owner
overturns row by row — that is a database's job, and conversational context
is handled by session-scoped agent state. The frontend is Next.js on Vercel
reading TiDB through views (the serverless HTTP driver), with one
least-privilege AWS key whose only permission is invoking the runtime.

## Challenges we ran into

The USDA FSIS recall API is bot-blocked at the network edge — even its own
documentation page — so we subscribed to FSIS's official GovDelivery emails
and built SES-inbound → S3 → parser instead; the agent now reads the same
announcement a human subscriber gets. openFDA turned out to be an archive,
not an alert feed (11-80 day lag), so freshness comes from the press-release
RSS with openFDA as structured enrichment. San Jose's Legistar populates its
consent flag as zero on every item, and city permit "Accepted" status turned
out to mean work COMPLETED (we proved it empirically: 85/85 sampled had
final dates) — both discovered only because we validated every source
against real data before building. And we learned a $30 lesson about reusing
a stateful chat agent in a batch loop: conversation history multiplied our
token spend ~25x until we cleared state per item.

## Accomplishments we're proud of

Every number in the demo is real: 90 days of genuine backfill, a live catch
emailed while nobody watched, and a rejection log whose reasons hold up when
you read them. The consent-calendar catch — construction rescheduled on the
store's own street, page 2 of a staff report — is the thesis in one screen.
And the persona is configuration, not code: the reasoning engine knows
nothing about groceries; swap the profile and the same radar watches a
salon or a taqueria.

## What we learned

Public data is real but hostile: bot walls, semantic traps, and archives
pretending to be feeds. An agent that reads documents beats keyword filters
in both directions — it catches what titles hide, and it filters what
titles inflate. And trust is built by showing the negative space: owners
believe the silence because they can audit it.

## What's next

Recall-termination-based expiry, alert-dismissal learning, richer street-work
windows, and profiles for more business types — the radar generalizes by
editing one page.

---

### Built with (Devpost tags field)
strands-agents, amazon-bedrock, bedrock-agentcore, claude, aws-lambda,
eventbridge, amazon-ses, amazon-s3, secrets-manager, tidb, nextjs, vercel,
typescript, python
