# Demo recording script (5-minute video, target runtime 4:40)

Structure follows the hackathon rules: the video must be 5 minutes or less
and must pitch the problem, who it is for, and why it matters. Those three
land in the first 40 seconds, before any clicking. Every scene runs on real
data already in TiDB.

## Pre-record checklist (all mandatory, in this order)

- [ ] **Pause the 6 AM scheduler AFTER that morning's run completes**
      (REQUIRED: a run mid-take changes on-screen numbers between scenes.
      Order matters: pause only after the 6 AM run has finished, so the
      trust stamp still shows today. Pausing the night before makes the
      stamp show yesterday and breaks S1):

      aws scheduler update-schedule --region us-west-2 \
        --name compliance-radar-daily --state DISABLED
      (name verified against the live account; re-enable with
      --state ENABLED after the final take. NOTE: update-schedule requires
      the full flag set on some CLI versions; if it errors, ask BE to
      pause/resume it instead.)
- [ ] **Run `scripts/demo_numbers.py` and reconcile the narration** before
      the first take. It prints, straight from TiDB, every figure this
      script quotes: totals, the action_type split, the operating window,
      per-source data ranges, the Albertsons cluster, the Fromm row
      position, and the profile counts. Numbers below are marked
      `(demo_numbers.py)` and reflect the 2026-09-11 run; if a number in
      this document cannot be produced by that script, it does not belong
      in the narration.
- [ ] Verify FE deployed: all-time totals strip, act / check / file tabs +
      Handled, Resolve modal, carry-list save, Ask panel wired, brief
      button, and **log search re-enabled** (S4 depends on it: Fromm is
      ~400 rows deep in the Food-recalls filter, unreachable by scrolling).
- [ ] Vercel env vars present (runtime key); warm the ask endpoint with one
      throwaway question ~2 min before recording (cold start).
- [ ] Confirm trust stamp shows today ("Checked today, 6:00 AM").
- [ ] Prepare the architecture frame: FE's new AWS-style diagram (Shopbell
      title) full screen, ready to cut to in the closing scene.
- [ ] Scene 5 fallback assets ready if used: email screenshot with the
      owner's email address BLURRED or cropped out (never show the raw
      inbox address on screen).

## Timeline

| Time | Scene |
|---|---|
| 0:00-0:40 | Pitch (no UI, or slow pan over the quiet home) |
| 0:40-1:10 | S1 The quiet home |
| 1:10-1:50 | S2 Rule 20A deep-read (the highlight) |
| 1:50-2:25 | S3 Recall catch + Resolve modal |
| 2:25-3:00 | S4 The overturn (learning loop) |
| 3:00-3:30 | S5 Rejection log, Albertsons cluster |
| 3:30-4:10 | S6 Ask the radar (two questions only) |
| 4:10-4:40 | S7 Profile + closing, architecture frame, live URL |

Cut list (only if time remains): real alert email (blur address), sewer
rates, street-work map. The strongest line from the email scene ("this
exact email went out while nobody was watching") survives as one sentence
of S1 narration even when the scene is cut.

## 0:00-0:40 — Pitch (rules requirement: problem, who, why)

No clicks. Say, over a title card or a slow pan of the home screen:

"A small grocery store sits under several regulators at once. Food recalls,
city council decisions, street construction. Hundreds of items flow past,
and the handful that actually hit this store look exactly like the hundreds
that don't. Owners can't read it all, so they read none of it, and the
anxiety never goes away.

This is Shopbell, built for the owner of an 18-employee grocery.
It reads everything every morning, interrupts almost never, and, this is
the important part, shows its work for every item it chose NOT to
interrupt about. Silence is the product; the rejection log is what makes
the silence trustworthy."

## S1 (0:40-1:10) — The quiet home

Open Overview. Expect: trust stamp with today's time; the all-time strip
(that day's numbers from demo_numbers.py: "761 read · 57 brought to you"
on 2026-09-11) with the period selector on its default
(all-time); topics table with all five tags, zero rows rendered as
watched-and-quiet; act / check / file tabs plus Handled.
Say: "In its first two weeks it read 761 real items, with data reaching
back to 2025. 57 were worth the owner's attention, and only 8 said act
now. Most mornings it brought nothing. One of those mornings it emailed a
live recall expansion at 6 AM on a Saturday while nobody was watching."
(All four figures from demo_numbers.py: 761 read / 57 surfaced / act 8;
operating window 2026-08-28 onward; oldest source dates are openFDA
2025-12-15 and street work 2025-07-18, which is what "reaching back to
2025" means. Never claim a 90-day window or a longer operating history.)
Breaks the take: missing trust stamp; topic rows hidden when zero; period
selector not on all-time (numbers in the narration assume it).

## S2 (1:10-1:50) — The consent-calendar catch (the highlight)

Open the Rule 20A item **from the check tab** (its action_type is NULL, so
the FE ranks it as verify; it is NOT under act. Know the tab before the
take so nobody hunts on camera). Expect: title a keyword alert would never flag
("Rule 20A and Rule 20B (In-Lieu Fee) Underground Utility Program"), the
June 2029 date chip from key_dates, and the evidence quote from staff
report page 2 ("will underground Lincoln Avenue from West San Carlos
Street...").
Say: "The agenda title says fee program. The agent read the staff report
behind the consent item, and page 2 says they are digging up this store's
street. It kept the quote and the page number as evidence. This is the
scene that proves it is not a keyword alert."
Breaks the take: evidence/key_dates not rendered; item resolved (reopen it).

## S3 (1:50-2:25) — The recall catch and Resolve

Click the Straus event card (grouped: 5 products, one card). Expect: hazard
line "foreign metal pieces" (backend field, not paraphrase), act badge,
expandable product list with full UPCs and "BEST BY: 27 DEC 26" lot info.
Click Resolve: modal lists 5 products, all checked by default; mark two as
"don't carry" via the row action, Save.
Say: "It names the exact flavors, the UPCs, the best-by dates to pull, and
resolving it is part of the audit trail."
Breaks the take: partial UPCs anywhere; modal missing default-checked state.

## S4 (2:25-3:00) — The overturn (learning loop, genuinely earned)

Open the Log and search "Fromm" (requires the re-enabled log search from
the checklist; the item sits at row 406 of 413 in the Food-recalls filter
per demo_numbers.py, so scrolling is not a fallback). Show the real miss: filtered as pet-related while the profile
says the store carries pet food. Overturn it with "This actually affects
us". Expect: it appears in overturn history.
Say: "This is a genuine miss, not a staged one. The correction becomes
retrieved context: future pet-food recalls arrive with this overturn in
front of the model."
(Undo exists if a take goes wrong: BE can revert in one command.)

## S5 (3:00-3:30) — The rejection log (silence made trustworthy)

Stay in the Log, filter to "Food recalls". Show the Albertsons cluster.
Say: "One competitor chain put out 121 recall notices dated a single day.
Every one was filtered with one legible sentence, and zero interrupted
the owner." (121 rows, one distinct source date: demo_numbers.py. Do not
say "in seven days" or "159".)
Show 2-3 favorite short reasons ("Sold exclusively at Albertsons",
"Distributed only to OR and WA").

## S6 (3:30-4:10) — Ask the radar (agent with tools)

Record this scene LAST (it is non-deterministic; plan at least two takes).
Open the chat. Ask exactly two questions:
1. "Why did this reach me?" from the sprouts item (expect grounded answer
   citing sprouts/deli profile facts).
2. "Show me what you filtered today" (expect a real filtered-list summary).
Say: "Same agent, same database, on AgentCore sessions. It answers from
rows it actually read, and says so when it can't."
Breaks the take: cold start (warm it first); a wrong or stale answer
(re-record).

## S7 (4:10-4:40) — Profile, architecture, closing

Open Store profile. Show the 8 facts and the 53-entry carry list (both
counts from demo_numbers.py). Add one
item via the modal ("Cooked steak, sliced to order" as don't-carry); point
at the effect-timing disclaimer ("applies from the next daily check").
Say: "The reasoning engine knows nothing about groceries. Everything
grocery-specific is this editable page. Swap the profile and the same
radar watches a salon or a taqueria."
Cut to the NEW architecture diagram (FE's AWS-style redraw with the
Shopbell name; do NOT use docs/architecture.png, which still carries the
old Compliance Radar title) for ~5 seconds while saying: "One Strands
agent, two modes, on Bedrock AgentCore. EventBridge to Lambda to the
runtime every morning; TiDB holds every decision, reason, and embedding."
End frame: the live URL and the repo URL on screen.

## After recording

- [ ] Re-enable the 6 AM scheduler (--state ENABLED).
- [ ] BE reset if another take is needed: resolutions, overturns, profile
      test entry (one command each; timestamps never faked).
- [ ] Keep the recording as backup for live-demo failure on judging day.
