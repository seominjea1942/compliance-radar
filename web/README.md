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
| `ItemCard` | shared shell for one decision: overview feed and log |
| `FilterPills` | segmented control for filtering a list in place |
| `RadarFace` | the radar mark, used by the Ask launcher and panel |

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

`/` overview, `/log`, `/profile`, `/item/[id]`, `/about` — reading live TiDB data. No mock data anywhere: if a
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
| Log | `v_filtered_log` (status/source/paging in the URL) |
| Profile | `store_profile` facts + carry_list (both writable) |
| Item detail | `v_surfaced_feed`, falling back to `v_filtered_log` |

Shapes follow `../docs/ui-data-contract.md`. The views are the query layer: TS
does `SELECT * FROM v_...`, and a screen needing a new shape gets a new view
rather than a bespoke join here.

Every read is now a view. There is no bespoke SQL left in the app.

### Open request: payload on the log

`v_filtered_log` has no `payload`, so the detail route can show provenance for
surfaced items but not filtered ones. Either add `payload` to that view or add
a `v_decision_detail` view covering both; the page degrades honestly until then
rather than joining `documents` here.

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
- **Writes.** Overturns, resolutions, profile facts and carry-list entries.
  Carry-list editing was unfrozen by owner sign-off on 2026-09-05; the runtime
  reads the profile from the DB, so an edit changes how FUTURE items are
  triaged and never rewrites a past decision. The save dialog says so, and
  notes that Ask the radar sees the change before the next daily check does.
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
- **Product fields decide layout by coverage.** `product_name` and `code_info`
  (~93% of surfaced recall rows) can anchor a layout; `sizes` ~85%, `brand`
  ~78%, `upcs` ~59%, `containers` ~37% are conditional and vanish cleanly.
  Headlines fall back to the source title when extraction found no name.
- **Long codes are announced, not truncated.** `code_info` runs from 6 to 692
  characters (median 37). Cards show it only when it fits at a glance and say
  "multiple date codes" otherwise, because half a list of sell-by dates reads
  as the whole list. The full value stays in the Resolve checklist and on the
  detail page, which is where lots actually get matched.
- **Sizes, UPCs and codes are never zipped into columns.** They are parallel
  but not 1:1 aligned (one row reads "QUART - BEST BY: 24 DEC 26; PINT - BEST
  BY: 25 DEC 26"), so a grid would mispair a code with the wrong size.
- **Ask the radar is UI only.** The launcher and panel are built; nothing is
  sent anywhere and no answer is generated, because answering means an LLM call
  and that goes through the backend's cost review first (hard rule 4). The
  panel says so rather than faking a reply. Each card's Ask button opens it
  scoped to that item.
- **One card per recall event.** Rows are grouped on the backend's `event_key`
  and never on titles or firms, so 48 rows render as 32 cards. A row without a
  key stands alone, which is also what a real single-item event looks like. A
  group is ranked by its worst member.
- **Resolve** writes `resolution` + `resolved_at` per product. A group opens the
  modal (there is a choice to make per product); a single-item card writes
  straight away, with "Don't carry" as the second outcome. "Keep open" writes
  nothing. Resolved rows are fetched rather than filtered in SQL, so a card can
  say "1 remaining of 5"; an event with nothing open leaves the feed.
- **The feed filters by tier**, and the heading follows the selection: "23
  items to check" rather than a fixed line about whether anything needs action.
  It opens on the most urgent group that is not empty (act, then check, then
  file), so the screen never opens on an empty list with work one tab away.
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
