# UI Data Contract — Compliance Radar

For the frontend session. Everything below reflects the REAL production TiDB
database (`compliance_radar`) as of 2026-09-02. Build against these shapes;
do not invent fields. Connection env vars live in `.env.local` at repo root
(TIDB_HOST/PORT/USER/PASSWORD/DATABASE, TLS required, use certifi CA).

## Sources and volumes (all-time, for context)

| source | reviewed | surfaced | filtered |
|---|---|---|---|
| openfda_enforcement | 360 | 38 | 322 |
| fda_rss | 26 | 3 | 23 |
| legistar | 62 | 1 | 61 |
| permits | 73 | 4 | 69 |
| fsis_email | 1 | 0 | 1 |

Decision values: `ALERT`, `REJECT`, `OPPORTUNITY`. Surfaced = ALERT + OPPORTUNITY.
Fixed tag set (exactly these 5): `food-recalls`, `city-programs-fees`,
`council-routine`, `nearby-construction`, `labor-workforce`.
`tags` columns are JSON arrays serialized as strings, e.g. `"[\"food-recalls\"]"`.

## Queryable views

### 1. `v_weekly_summary` — home screen strip ("reviewed 94, surfaced 2")
Columns: `source` (str), `reviewed` (int), `surfaced` (num), `filtered` (num).
Rolling last-7-days window. One row per source; sum across rows for the
headline numbers. NOTE: on quiet weeks some sources have no row at all.

### 2. `v_filtered_log` — rejection log screen (reasons are the primary content)
Columns: `decision_id` (int), `title` (str), `source` (str), `reason` (str,
one sentence), `tags` (JSON-string), `profile_fact_id` (str|null),
`created_at` (datetime), `overturned` (0|1). Ordered newest first. Sample row:

```json
{"decision_id": 60012,
 "title": "Kettle Cuisine Recalls Marketside Tomato Bisque Soup Kit – Sold Exclusively at Walmart Stores...",
 "source": "fda_rss",
 "reason": "This product is sold exclusively at Walmart stores; there is no indication that Willow Glen Family Market stocks this Marketside brand soup kit.",
 "tags": "[\"food-recalls\"]", "profile_fact_id": null,
 "created_at": "2026-08-28 21:05:30", "overturned": 0}
```

### 3. `v_overturns` — overturn history
Columns: `decision_id`, `title`, `source`, `original_reason`,
`overturn_reason_type` (`affects_us` | `always_show` | `curious` | `other`),
`overturn_note` (str|null), `overturned_at`. Currently EMPTY (no overturns
yet); the demo will create one live (see Fromm item below).

To WRITE an overturn, update `triage_decisions`:
```sql
UPDATE triage_decisions SET overturned=TRUE, overturned_at=NOW(),
  overturn_reason_type=%s, overturn_note=%s WHERE id=%s
```
(or import `radar.db.apply_overturn`). "curious" overturns are automatically
excluded from the learning signal by the backend; the UI just stores them.

To REVERT an overturn (toggle back to filtered/set-aside; also removes it
from the learning signal):
```sql
UPDATE triage_decisions SET overturned=FALSE, overturned_at=NULL,
  overturn_reason_type=NULL, overturn_note=NULL WHERE id=%s
```

### 4. `v_nearby_permits` — home map (store pin + gray watched pins)
Columns: `document_id` (BIGINT, can exceed JS safe int, treat as STRING),
`title`, `lat` (str), `lon` (str), `status`, `distance_from_store_m` (str),
`issue_date`, `decision`, `reason`. lat/lon/distance come back as strings;
parseFloat them. Store anchor: lat 37.3053, lon -121.8990 (1287 Lincoln Ave;
updated 2026-09-03). BACKGROUND CONTEXT ONLY since v_street_work landed:
building permits don't answer the street-access question (see section 8);
render as gray context pins. The 4 residential ALERTs are fyi: demote.

### 5. `v_surfaced_feed` — alerts feed (now a real view)
Columns: `decision_id`, `title`, `source`, `decision`, `action_type`,
`reason`, `tags`, `profile_fact_id`, `created_at`, `payload`. Newest first.

`action_type` (the ranking signal you asked for, 2026-09-02):
- `act` (7 rows): the store is affected on the stated facts; every current
  act row is a literal carry-list brand match (Straus x5, Motor City, Amy's).
- `verify` (30): one concrete check exists (named product plausibly on the
  shelf). NOTE: the sprouts alerts are `verify` under the strict definition
  ("check the walk-in" IS the concrete check); rank Class I / pathogen
  verify items above the rest using payload.classification + reason.
- `fyi` (9): awareness only (includes the 4 residential permit alerts).
- NULL on REJECT rows always.
New items get action_type at triage time; the prompt was also tightened so
category-overlap-only recalls now REJECT instead of becoming verify alerts,
so the verify volume should fall going forward.
`payload` is the full normalized source item (JSON string). Useful payload
fields by source: fda: `classification` ("Class I/II/III" — MISSING on
fda_rss items, derive urgency from reason text), `distribution_pattern`,
`recall_initiation_date`, `recalling_firm`; legistar: `meeting_date`,
`matter_type`, `on_consent_calendar` (bool), `agenda_number`, and for
deep-read items `key_dates` (list of {label, date}), `evidence`
({quote, page_hint}), `staff_report_attachment`; permits: `lat`, `lon`,
`permit_value`, `square_footage`, `address`, `work_category`.

### 6. `v_weekly_topics` — per-tag home table (added 2026-09-03)
Columns: `tag` (str), `read` (int), `for_you` (num). One row per fixed tag,
zeros kept, rolling 7 days. Replaces the interim getWeeklyTopics() query.

### 7. `v_run_status` — trust stamp (added 2026-09-03)
Single row: `last_checked` (datetime, UTC) = the last pipeline run, INCLUDING
quiet runs that triaged nothing (backed by a new pipeline_runs table the
runtime writes on every daily run). Replaces MAX(created_at), which lied on
quiet days. NOTE: the first row appears after the next daily run (or manual
invoke); render "not yet checked" for NULL.

### short_reason (added 2026-09-03, request #4)
`triage_decisions.short_reason` (<=160 chars, typically <=100): one-clause
display variant of `reason` that omits the store name / category / class the
UI already shows. Exposed on `v_filtered_log` and `v_surfaced_feed`. Full
`reason` is unchanged and remains the recorded decision rationale; new items
generate both fields at triage time.

### event_key + resolution (added 2026-09-03, Resolve flow)
`v_surfaced_feed` now also has:
- `event_key` (str): rows sharing it are ONE real-world recall event (openFDA
  event_id where available; press-release link for fda_rss; external_id
  otherwise). Group feed cards on it. Verified groupings include Straus (5
  rows), Zapp's/Dirty chips (6 rows, genuinely one openFDA event), Boichik (3).
- `resolution` (`handled` | `not_carried` | NULL=open), `resolved_at` (UTC).
- `hazard` (str|NULL, added 2026-09-04): max-5-word hazard compressed from the
  record's own reason_for_recall, never invented (e.g. "foreign metal
  pieces"). Recall rows only; use it for the group-card hazard line instead of
  trimming reason_for_recall client-side. Single-item Resolve confirmed: no
  modal; Resolve writes `handled`, the secondary "Don't carry" action writes
  `not_carried`.
Write path for Save (per selected row):
```sql
UPDATE triage_decisions SET resolution=%s, resolved_at=NOW() WHERE id=%s
```
"Keep open" rows: write nothing. Resolution is independent of the overturn
flow (overturns belong to REJECT rows).

### payload.product — structured product fields (added 2026-09-04)
openFDA recall documents now carry `payload.product` (extraction, not
invention: strings copied from the description, UPCs regex-validated;
missing = null/[]), plus repaired full-length titles and two new payload
fields. Fill rates so the design knows what it can rely on:

| field | surfaced rows (38) | all openFDA (360) | notes |
|---|---|---|---|
| product.product_name | 100% | 100% | design anchor: always present |
| product.brand | 84% | 74% | fall back to recalling_firm |
| product.sizes[] | 92% | 67% | |
| product.upcs[] | 63% | 29% | digits-only, validated; NEVER render a partial |
| product.containers[] | 39% | 32% | garnish only |
| code_info (lot/best-by) | 100% | 100% | e.g. "BEST BY: 27 DEC 26" — gold for the Resolve checklist |
| product_quantity | 100% | 100% | e.g. "637 cases (6 units/case)" |

Design guidance: build the card on product_name + brand + sizes + hazard,
show UPC and code_info when present, and keep the full `title` reachable
(detail view) as ground truth. Titles are no longer truncated at ingest
(old 200-char cap removed; 359 payloads repaired from openFDA).

## Store profile (profile screen, editable)

Table `store_profile`, single row id=1, column `profile` (JSON):
`{store_name, owner, location, carry_list:{source, granularity, entries:[{category, carries, brands[]}]}, facts:[{id, fact, implies}]}`.
53 carry entries + 8 facts.

CARRY LIST UNFROZEN (owner sign-off 2026-09-05): the profile screen's add/edit
saves for real now. The runtime reads the DB profile live (file only as
fallback), so edits change triage of FUTURE items; past decisions never change.

Write path for "Add an item" (atomic, no read-modify-write needed):
```sql
UPDATE store_profile
SET profile = JSON_ARRAY_APPEND(profile, '$.carry_list.entries',
      CAST(%s AS JSON))          -- %s = '{"category":"...","carries":false,"brands":[]}'
WHERE id = 1
```
To edit/remove an entry, read the row, modify the JSON in the route, and write
it back whole (single-owner app; lost-update risk is negligible).

REQUIRED DISCLAIMER on save (exact semantics): changes take effect at the next
daily check, which runs at 6:00 AM America/Los_Angeles. Compute that timestamp
client-side ("Applies from tomorrow, 6:00 AM" or today if before 6 AM) and say
that today's list and already-made decisions are unchanged. The chat agent
("Ask the radar") sees profile edits immediately, so answers may reflect a new
entry before the next triage run does; that is expected and truthful.

## Demo-week composition (agreed, do not fabricate)

- Surfaced #1: Everything Sprouts alfalfa recall, decision exists
  (source fda_rss, 2026-08-22) + its REAL expansion alert (Robust Radish
  Mix, 2026-08-30, emailed to the owner in production).
- The Rule 20A Lincoln Ave item (m16125) and sewer-rates item (m16131) are
  currently REJECT in the DB pending a human decision on adding the store
  address to the profile; the UI should render whatever the DB says.
- Overturn demo: Fromm dog-food rejection (search title LIKE '%Fromm%'),
  reason_type "affects_us".

## Forwardable brief

Generated on demand by backend (`radar.brief.make_brief(payload, reason,
store_name)` -> plain text, 4 sections: WHAT HAPPENED / WHY IT MAY AFFECT THE
STORE / DEADLINE OR TIMING / SOURCE). ~2s latency, costs a fraction of a
cent. Not pre-stored; the UI should call it lazily per surfaced item.

## Stack recommendations (resolves the cons you flagged)

1. **DB access: use `@tidbcloud/serverless`, not `mysql2`.** It is HTTP-based,
   so there are no TCP connections to pool and no connection-limit risk from
   short-lived serverless functions, and it runs on the Edge runtime too.
   Get its connection string from the TiDB Cloud console: cluster -> Connect ->
   select "Serverless Driver" (same cluster, different connect format).
2. **Query duplication: don't duplicate.** All shared query logic lives in the
   DB views above; the TS side should be `SELECT * FROM v_...` one-liners.
   If a screen needs a new shape, ask the backend session to add/extend a view
   rather than writing bespoke joins in TS: the views are the single source of
   truth for both languages.
3. **The one Node-runtime route.** Only the forwardable-brief endpoint needs
   the AWS SDK (Bedrock call); keep that single route handler on the Node
   runtime and everything else can be Edge or static. Do NOT put the project's
   admin AWS keys in Vercel: request a least-privilege key (bedrock:InvokeModel
   only) from the backend session, which will provision it.
4. **Scoping rule (CORRECTED 2026-09-05): stats are weekly, the todo list is
   not.** The 7-day window applies to activity STATS only: the "read this
   week" strip, v_weekly_summary, v_weekly_topics. The action tabs
   (Needs action / To check / For the file) are an OPEN-OBLIGATIONS list:
   show ALL rows with resolution IS NULL regardless of age: an unchecked
   recall does not stop needing action after 7 days, and silently aging
   items out contradicts the product promise. Show age on old items
   ("flagged 8 days ago") instead of hiding them. (True expiry should come
   from recall termination status, not time: roadmap, not built.) Render
   zero-count topics as "watched, quiet this week" states instead of hiding
   them: the empty rows are the product thesis, not missing data.

### 8. `v_street_work` — the map card's real answer (REVISED 2026-09-05)

Your six questions, answered from the source schema and a 193-permit sample:

1. **Pavement/moratorium**: the earlier 600m box legitimately contained zero
   pavement projects (not a bug); pavement + moratorium now use a wider
   ~1.2km box. Current rows: 21 street_excavation_permit, 1
   pavement_project_future, 40 pavement_moratorium (new work_type:
   no-dig recently-paved segments, deterministic REJECT context for the map,
   never LLM-triaged).
2. **Issued vs Accepted, verified empirically**: 'Accepted' means work
   COMPLETED and accepted by the city (85/85 sampled had FINALDATE set) —
   the opposite of active. 'Issued' = authorized/active (23/23 unfinaled).
   The feed now includes ONLY Issued + unexpired + unfinaled, surfaced as
   status "Issued (active)". Never render 'Accepted' as current work.
3. **Dates exist and are now ingested**: `expiry_date` (payload + view) and
   FINALDATE (used as a filter) are the activity signals; stale-status rows
   are excluded at ingest. Show "permit valid through {expiry_date}".
4. **Repeat segments are genuinely different jobs**: `work_description` shows
   e.g. three separate PG&E bellhole/water/pole jobs on the same block.
   Grouping by segment in the UI is right; the count is real disruption
   potential, not paperwork duplication.
5. **Work description ingested**: `work_description` (from the city's
   FOLDERDESCRIPTION) names the utility and the job ("PGE TO REPLACE POLE
   AND OH SERVICE", "FIBER PLACEMENT AND SPLICING"). Use it as the card
   line; it is city text, not generated.
6. **Street-name signal added**: `on_store_street` (bool string) = segment or
   description names Lincoln. Recommended card logic: on_store_street items
   first, then by distance; radius stays the fallback.

Columns now: `document_id` (string), `title`, `work_type`
(street_excavation_permit | pavement_project_future |
pavement_project_current | pavement_moratorium), `status`, `segment`,
`work_description`, `issue_date`, `expiry_date`, `on_store_street`,
`project_year`, `lat`/`lon`, `distance_from_store_m`, `decision`,
`action_type`, `short_reason`, `reason`. Nearest first.

Honest state as of 2026-09-05: ALL 21 active permits REJECTed with reasons
(parallel streets, pole/vegetation work): the card's truthful headline today
is "No active street work blocking your block", with the 21 watched items
and 40 protected segments as proof of watching, and the Rule 20A June-2029
item as the surfaced longer-horizon story.

## Ask the radar + brief (runtime API, added 2026-09-04)

Both run on the deployed AgentCore runtime; call InvokeAgentRuntime from a
Node route using the least-privilege key in `.vercel-aws-key.local` (env vars
for Vercel; AGENT_RUNTIME_ARN included). Payloads:

- Chat: `{"action":"ask", "question":"...", "session_id":"<stable per browser
  chat session>", "decision_id": "<STRING, optional item scope>"}` ->
  `{"status":"ok","answer":"<markdown-lite text>"}`. Session history lives
  server-side keyed by session_id (bounded sliding window); pass the same
  session_id for follow-ups. Also pass the SAME value as the
  runtimeSessionId invoke parameter (NOTE: AWS requires runtimeSessionId to
  be at least 33 characters; a uuid4 hex with a prefix works).
  decision_id MUST be sent as a string end to end: these BIGINTs exceed
  Number.MAX_SAFE_INTEGER and Number() silently corrupts them into ids that
  "don't exist" (measured 2026-09-04); the runtime accepts string ids.
  Latency: typically 3-8s warm, but vague questions can tool-thrash; measured
  worst case 121.9s before a 3-tool-call budget was added. Keep the FE 55s
  abort with a friendly message (Vercel maxDuration 60 ceiling); answers may contain
  **bold** markdown. The agent has tools over the live DB (decision lookup,
  filtered log, open items, semantic search), so the three suggested prompts
  in the design all work as-is.
- Brief: `{"action":"brief", "decision_id": "<STRING, same rule as ask>"}` -> `{"status":"ok",
  "brief":"<plain text>"}` (replaces the earlier make_brief guidance; no
  Bedrock key needed on Vercel anymore, this one key covers both).

## Hard rules from the backend

1. Never re-triage or mutate historical decisions from the UI; the only
   allowed write paths are overturns (above) and profile edits (facts only).
2. BIGINT ids as strings in JS.
3. All timestamps are UTC in the DB; render in America/Los_Angeles.
4. Any new LLM-calling feature must go through cost review first (house rule
   after a $30 token incident).
