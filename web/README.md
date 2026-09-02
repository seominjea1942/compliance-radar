# Compliance Radar — web

Frontend for Compliance Radar, ported from the Claude Design canvas
`Compliance Radar.dc.html`. Next.js App Router, deployed on Vercel.

## What is implemented

The **home screen** (`/`), reading live TiDB data. No mock data anywhere: if a
value is not in the database, the component omits it rather than inventing one.

| Region | Source |
|---|---|
| Hero + surfaced feed | `triage_decisions` JOIN `documents`, `decision IN ('ALERT','OPPORTUNITY')` |
| Sidebar store/owner | `store_profile` row `id = 1` |
| Topic table | `triage_decisions` grouped by `tags` over a 90-day window |
| "Checked …" stamp | `MAX(created_at)` from `triage_decisions` |
| Nearby permits map | `v_nearby_permits` |

Shapes follow `../docs/ui-data-contract.md`.

## Running locally

```bash
npm install
npm run dev
```

Needs `web/.env.local` with the same five variables the Python side uses:
`TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`.

## Deploying to Vercel

Set the project's **Root Directory** to `web`, then add those five variables in
Project Settings → Environment Variables. The home route is `force-dynamic`, so
it queries TiDB per request rather than serving a build-time snapshot.

`lib/db.ts` caches the connection pool on `globalThis` so warm serverless
invocations reuse connections; `connectionLimit` is deliberately low (4) because
each Vercel instance opens its own pool against TiDB's connection cap.

## Notes for whoever picks this up

- **Two drivers, one database.** `tags`, `payload` and `profile` are native
  MySQL `json` columns. pymysql returns them as strings (which is what the data
  contract describes); mysql2 parses them into objects first. `asJson()` in
  `lib/queries.ts` accepts both. Any new query touching a JSON column must go
  through it.
- **Writes.** None. The contract permits exactly two write paths (overturns and
  profile facts) and the home screen needs neither. "Done" is session-local
  view state, not persistence.
- **Severity** is taken from the FDA `classification` field where the source
  provides one (Class I → urgent, Class III → logged). Items without a
  classification, including everything from `fda_rss`, stay at "worth knowing"
  rather than being inferred from the reason prose.
- **BIGINT ids** are read as strings (`bigNumberStrings: true`), per contract
  rule 2. Do not turn them into numbers.
