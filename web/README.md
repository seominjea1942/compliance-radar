# Compliance Radar — web

Frontend for Compliance Radar, ported from the Claude Design canvas
`Compliance Radar.dc.html`. Next.js App Router + Tailwind v4 + shadcn/ui,
deployed on Vercel.

## Design system

Change a colour, font or radius in **one** place: the `@theme` block at the top
of `app/globals.css`. Those tokens drive both the Tailwind utilities
(`bg-paper`, `text-ink`, `border-line`, `fill-pin`) and the shadcn semantic
tokens (`--primary`, `--card`, `--border`) declared just below them, so any
shadcn component added later inherits the editorial look without being
restyled by hand.

Primitives live in `components/ui/`:

| Component | Covers |
|---|---|
| `Button` | variants incl. `cardAction` (the quiet Done / Share / Ask row) |
| `Card` | tones `paper` (outer panel), `inset` (nested item), `urgent` |
| `Badge` | the uppercase mono eyebrow: source chips, recall class |
| `Avatar` | initials tile (`square` store, `round` owner) |
| `NavItem` | a row in the left rail |

Screen-level components (`Sidebar`, `TopicTable`, `SurfacedCard`, `PermitMap`)
compose those. Add a card action by adding one `<Button variant="cardAction">`,
not by copying a style object.

The design is a wireframe, not a pixel target: it sets the visual language,
while the live data decides what actually renders.

Note: `text-muted` is the design's muted *ink* (`#6E675C`). shadcn's muted
*surface* is `bg-muted-bg`. They are different tokens on purpose.

## What is implemented

The **home screen** (`/`), reading live TiDB data. No mock data anywhere: if a
value is not in the database, the component omits it rather than inventing one.

Scope is the **current 7-day window**; 90-day totals belong to the log screen.

| Region | Source |
|---|---|
| Home strip totals | `v_weekly_summary` (summed across source rows) |
| Surfaced feed | the contract's sanctioned direct query (§5), scoped to 7 days |
| Nearby permits map | `v_nearby_permits` |
| Sidebar store/owner | `store_profile` row `id = 1` |
| Topic table | ⚠ interim — needs `v_weekly_topics` |
| "Checked …" stamp | ⚠ interim — needs `last_checked` |

Shapes follow `../docs/ui-data-contract.md`. The views are the query layer: TS
does `SELECT * FROM v_...`, and a screen needing a new shape gets a new view
rather than a bespoke join here.

### Pending view requests

`lib/pending-views.ts` holds the only bespoke SQL in the app, for the two
elements no view covers. Both are requested from the backend session; when the
views land, delete that file and point the call sites at the views.

### A note on the 7-day window

Scoping the home screen to 7 days currently changes nothing: all 522 decisions
were triaged in one backfill batch (2026-08-28 to 08-30), so the rolling week
and all-time return identical numbers, and the feed shows 46 surfaced items
rather than the design's three. `created_at` is the *triage* timestamp, not the
item's publication date. Producing the design's composition needs either
ongoing daily ingestion or a view that scopes on source publication date.

## Running locally

```bash
npm install
npm run dev
```

Needs either `DATABASE_URL` (TiDB Cloud console → Connect → **Serverless
Driver**) or the same five variables the Python side uses: `TIDB_HOST`,
`TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`, which
`lib/db.ts` assembles into a connection URL.

## Deploying to Vercel

Set the project's **Root Directory** to `web`, then add `DATABASE_URL` in
Project Settings → Environment Variables. The home route is `force-dynamic`, so
it queries TiDB per request rather than serving a build-time snapshot.

DB access uses **`@tidbcloud/serverless`**, not `mysql2`: it is HTTP-based, so
there are no TCP connections to pool and short-lived serverless invocations
cannot exhaust the cluster's connection limit. It also runs on the Edge runtime,
so these routes are not pinned to Node.

When the forwardable-brief endpoint is built it will be the one Node-runtime
route (it needs the AWS SDK for Bedrock). It wants a least-privilege key scoped
to `bedrock:InvokeModel` — not the project's admin AWS keys.

## Notes for whoever picks this up

- **JSON columns.** `tags`, `payload` and `profile` are native MySQL `json`.
  The contract describes them as serialized strings (true of pymysql); HTTP
  drivers hand back parsed values. `asJson()` in `lib/queries.ts` accepts both,
  and any new query touching a JSON column must go through it.
- **Writes.** None. The contract permits exactly two write paths (overturns and
  profile facts) and the home screen needs neither. "Done" is session-local
  view state, not persistence.
- **Feed order** is severity first, then newest within a severity. Severity is
  derived from the payload, so the sort cannot live in SQL; it happens in
  `getSurfaced()` after mapping. Without it, ingestion time decides what the
  owner sees first and Class I recalls sink below routine permits.
- **Content column** is capped at 800px and centred, so it does not sprawl on
  wide screens. The bottom row (topic table + map) is sized to stay 2-up inside
  that cap rather than wrapping and orphaning the map.
- **Responsive, not a separate mobile build.** The rail is a left column at
  `md+` and a sticky top bar below it, with the nav scrolling horizontally.
  Plain Tailwind breakpoints, no JS and no second layout to maintain.
- **Map projection.** The plate scales to the 90th percentile of permit
  distance, not the furthest permit, because a few outliers would otherwise
  compress ~70 near-store permits into an unreadable blob. Outliers are clamped
  to the edge keeping their bearing. The streets are the design's decoration,
  not surveyed geometry.
- **Severity** is taken from the FDA `classification` field where the source
  provides one (Class I → urgent, Class III → logged). The contract suggests
  deriving urgency from reason text where classification is missing (fda_rss);
  that is deliberately not done, because keyword-sniffing prose would
  manufacture a severity the record does not state. Say the word if you want it.
- **BIGINT ids** are read as strings (`bigNumberStrings: true`), per contract
  rule 2. Do not turn them into numbers.
