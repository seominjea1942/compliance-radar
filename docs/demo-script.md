# Demo click-through script (recording checklist)

Every scenario below runs on real data already in TiDB. Prerequisites listed
first; each scenario has the clicks, the expected state, and what breaks the
take if missing. Order is the suggested recording order.

## Pre-record checklist (do in this order)

- [ ] BE grooming run (owner approved wording pending): reopen the 3 Sept
      council items, bulk-resolve the aged Aug verifies, keep open: sprouts
      pair, 1-2 act recall events, sewer ALERT, Rule 20A, concrete-repair
      OPPORTUNITY, Fromm stays REJECT+not-overturned.
- [ ] Verify FE deployed: action tabs unscoped + age labels (contract rec #4),
      street-work card, Resolve modal, carry-list save, Ask panel wired to the
      runtime, brief button.
- [ ] Vercel env vars present (runtime key); warm the ask endpoint with one
      throwaway question ~2 min before recording (cold start).
- [ ] Optional: BE pauses the 6 AM scheduler during takes (ask if wanted).
- [ ] Confirm trust stamp shows today ("Checked today, 6:00 AM").

## Scenario 1 — The quiet open (product thesis)

Open Overview. Expect: trust stamp with today's time; "read this week" strip
with a modest number; topics table with all five tags INCLUDING zero rows
rendered as watched-and-quiet; a small Needs action count (single digits).
Say the line: "It read hundreds of items; it interrupted about a handful in
90 days; half of all weeks were completely silent."
Breaks the take: missing trust stamp; topic rows hidden when zero.

## Scenario 2 — The recall catch and Resolve (hero interaction)

Click the Straus event card (grouped: 5 products, one card). Expect: hazard
line "foreign metal pieces" (backend field, not paraphrase), act badge,
expandable product list with full UPCs and "BEST BY: 27 DEC 26" lot info.
Click Resolve: modal lists 5 products, all checked by default; uncheck none,
mark two as "don't carry" via the row action, Save. Expect: card closes or
shows remaining, log reflects it.
Breaks the take: partial UPCs anywhere; modal missing default-checked state.

## Scenario 3 — The live-alert story (real email)

Show the real alert email received Aug 30, 6:00 AM (Robust Radish expansion)
in the owner's inbox, then the matching item in the feed. Click "Share via
email" on it: expect a forwardable brief (4 plain-text sections) generated in
a few seconds. Say: "This exact email went out while nobody was watching."
Breaks the take: brief endpoint not wired; latency over ~10s (warm it first).

## Scenario 4 — The consent-calendar catch (the thesis proof)

Open the Rule 20A item. Expect: title that keyword search would never flag
("Rule 20A and Rule 20B (In-Lieu Fee) Underground Utility Program"), the
June 2029 date chip from key_dates, and the "where we found it" evidence
quote (staff report page 2: "will underground Lincoln Avenue from West San
Carlos Street..."). Say: "The agenda title says fee program. Page 2 says
they're digging up this street."
Breaks the take: evidence/key_dates not rendered; item resolved (reopen it).

## Scenario 5 — The fee that lands on the bill

Open the sewer-rates ALERT. Expect: hearing date chip (2026-08-11), evidence
quote about $209M placed on the county property tax roll, deli rate-class
reasoning. Quick beat, 15 seconds.

## Scenario 6 — The honest map

Open the map/street-work card. Expect headline: "No active street work
blocking your block" (or current count), with watched excavation permits
listed with utility work descriptions ("PG&E to replace pole...") and expiry
dates, moratorium segments as protected context, building permits demoted to
gray. Say: "Watching is the feature. Most days the answer is no, and it shows
its work."

## Scenario 7 — The rejection log (silence made trustworthy)

Open the Log, filter by "Food recalls". Scroll the Albertsons cluster: say
"one competitor's bad week: 159 recalls hit the feed in seven days; every one
filtered with one legible sentence; zero interruptions." Show 2-3 favorite
short reasons ("Sold exclusively at Albertsons", "Distributed only to OR and
WA", "City payroll classification, not private wage law").

## Scenario 8 — The overturn (learning loop, genuinely earned)

In the log, search "Fromm". Show the real miss: dog-food recall filtered as
"pet food, unrelated" while the profile says the store carries pet food.
Overturn it with "This actually affects us". Expect: it appears in overturn
history; say: "future pet-food recalls now retrieve this correction as
context." (Undo exists if a take goes wrong: BE can revert.)

## Scenario 9 — Ask the radar (agent with tools)

Open the chat. Ask, in order:
1. "Why did this reach me?" from the sprouts item (expect grounded answer
   citing sprouts/deli profile facts).
2. "Show me what you filtered today" (expect real filtered list summary).
3. "What did I handle recently?" (expect the Resolve actions from Scenario 2,
   "as of now" phrasing).
Say: "Same agent, same data, on AgentCore sessions: it answers from what it
watched, and says so when it can't."
Breaks the take: cold start latency; wrong/stale answers (re-record, it's
non-deterministic prose).

## Scenario 10 — The closing shot (generalization argument)

Open Store profile. Show the 8 facts and the 53-entry carry list. Add one
item via the modal ("Cooked steak, sliced to order" as don't-carry): expect
the effect-timing disclaimer ("applies from the next daily check, 6:00 AM").
Closing line: "The reasoning engine knows nothing about groceries. Everything
grocery-specific is this editable page. Swap the profile, and the same radar
watches a salon, a taqueria, a bike shop."

## After recording

- [ ] BE reset if another take is needed: resolutions, overturns, profile
      test entry (one command each; timestamps never faked).
- [ ] Keep the recording as backup for live-demo failure on judging day.
