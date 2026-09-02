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

### 4. `v_nearby_permits` — home map (store pin + gray watched pins)
Columns: `document_id` (BIGINT, can exceed JS safe int, treat as STRING),
`title`, `lat` (str), `lon` (str), `status`, `distance_from_store_m` (str),
`issue_date`, `decision`, `reason`. lat/lon/distance come back as strings;
parseFloat them. Store anchor: lat 37.3085, lon -121.8995. 73 rows, nearly
all REJECT (gray pins); 4 ALERTs are residential items very close by (known
over-sensitivity; render them as normal alerts or gray, design's call).

### 5. Surfaced items (alerts feed) — no dedicated view, query directly:
```sql
SELECT d.id AS decision_id, doc.title, doc.source, d.decision, d.reason,
       d.tags, d.profile_fact_id, d.created_at, doc.payload
FROM triage_decisions d JOIN documents doc ON doc.id = d.document_id
WHERE d.decision IN ('ALERT','OPPORTUNITY')
ORDER BY d.created_at DESC
```
`payload` is the full normalized source item (JSON string). Useful payload
fields by source: fda: `classification` ("Class I/II/III" — MISSING on
fda_rss items, derive urgency from reason text), `distribution_pattern`,
`recall_initiation_date`, `recalling_firm`; legistar: `meeting_date`,
`matter_type`, `on_consent_calendar` (bool), `agenda_number`, and for
deep-read items `key_dates` (list of {label, date}), `evidence`
({quote, page_hint}), `staff_report_attachment`; permits: `lat`, `lon`,
`permit_value`, `square_footage`, `address`, `work_category`.

## Store profile (profile screen, editable)

Table `store_profile`, single row id=1, column `profile` (JSON):
`{store_name, owner, location, carry_list:{source, granularity, entries:[{category, carries, brands[]}]}, facts:[{id, fact, implies}]}`.
53 carry entries + 8 facts. CARRY LIST IS FROZEN until after the demo: the
UI may render an edit experience but writes to carry_list need human signoff.

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

## Hard rules from the backend

1. Never re-triage or mutate historical decisions from the UI; the only
   allowed write paths are overturns (above) and profile edits (facts only).
2. BIGINT ids as strings in JS.
3. All timestamps are UTC in the DB; render in America/Los_Angeles.
4. Any new LLM-calling feature must go through cost review first (house rule
   after a $30 token incident).
