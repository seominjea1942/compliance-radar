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
| `Tooltip` | designed hover/focus bubble, Radix-backed |
| `FilterPills` | segmented control for filtering a list in place |

Icons are Google Material Design, via `react-icons/md` (SVG components rather
than the icon font, so there is no ligature flash on load).

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
| Surfaced feed | `v_surfaced_feed`, scoped to 7 days |
| Topic table | `v_weekly_topics` |
| "Checked …" stamp | `v_run_status` |
| Nearby permits map | `v_nearby_permits` |
| Sidebar store/owner | `store_profile` row `id = 1` |

Shapes follow `../docs/ui-data-contract.md`. The views are the query layer: TS
does `SELECT * FROM v_...`, and a screen needing a new shape gets a new view
rather than a bespoke join here.

Every read is now a view. There is no bespoke SQL left in the app.

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
- **Feed order** comes from the backend's `action_type`: act, then priority
  verify, then verify, then fyi, newest within a tier. The promotion inside
  `verify` uses `payload.classification` plus a narrow pathogen term list,
  because `classification` is missing on every `fda_rss` row (the sprouts
  recalls included) and the contract explicitly sanctions reading the reason
  there. That list only reorders; it never decides what surfaces.
- **The headline counts `act`, not everything surfaced.** Most surfaced rows
  are precautionary checks; calling forty of those "things that need you" is
  the alert fatigue the product exists to prevent.
- **`short_reason` in list rows**, full `reason` reserved for detail views.
- **The feed filters by tier** and opens on "Needs action", so the owner lands
  on the seven items that matter rather than scrolling forty-eight. It falls
  back to "All" when nothing needs action.
- **Content column** is capped at 800px and centred, so it does not sprawl on
  wide screens. The topic table and the map each get their own full-width row.
- **Map plate** carries the same aspect ratio as its viewBox, so the SVG fits
  exactly and the roads reach the edges instead of letterboxing into the
  middle. Road positions are fractions of W/H so the plate can be resized.
- **Responsive, not a separate mobile build.** The rail is a left column at
  `md+` and a sticky top bar below it, with the nav scrolling horizontally.
  Plain Tailwind breakpoints, no JS and no second layout to maintain.
- **Map projection.** The plate scales to the 90th percentile of permit
  distance, not the furthest permit, because a few outliers would otherwise
  compress ~70 near-store permits into an unreadable blob. Outliers are clamped
  to the edge keeping their bearing. The streets are the design's decoration,
  not surveyed geometry.
- **The alert banner means "the store is affected"** (`action_type = act`),
  not "a serious recall exists". A Class I recall of something the store does
  not stock is not an emergency.
- **Recall class chips** show the FDA's own term (Class I/II/III) because that
  is what the source document says, with an info icon and a tooltip carrying
  the plain-English meaning. The chip is focusable, so the explanation is
  reachable by keyboard and not hover-only.
- **BIGINT ids** are read as strings (`bigNumberStrings: true`), per contract
  rule 2. Do not turn them into numbers.
