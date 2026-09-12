# Voiceover script (English, TTS-ready)

Spoken lines only, one block per scene, matching docs/demo-script.md
timings. Word counts assume ~150 words per minute; each block is written
shorter than its slot so screen actions have room to breathe.

Generate ONE AUDIO CLIP PER BLOCK (not one long file) and align each clip
to its scene in the video editor. Paste each block into the TTS tool
as-is; the punctuation carries the pauses.

Pronunciation notes for the TTS tool:
- Shopbell: one word, stress on "Shop".
- TiDB: say "Ty-D-B". If the tool mangles it, write it as "Ty D B".
- UPCs: say "U-P-Cs". If mangled, write "U P Cs".
- Rule 20A: "rule twenty-A".
- AgentCore, EventBridge, Lambda: normal English words, no changes needed.
- Numbers below are the 2026-09-11 demo_numbers.py run. Re-run the script
  on recording day and update 761 / 30 / 4 / 121 here before generating
  audio.

---

## Block 1 — Pitch (0:00-0:40, target 100 words)

A small grocery store sits under several regulators at once. Food
recalls. City council decisions. Street construction. Hundreds of items
flow past, and the handful that actually hit this store look exactly
like the hundreds that don't. Owners can't read it all, so they read
none of it, and the anxiety never goes away.

This is Shopbell, built for the owner of an eighteen-employee grocery.
It reads everything, every morning. It interrupts almost never. And,
this is the important part, it shows its work for every item it chose
not to interrupt about. Silence is the product. The rejection log is
what makes the silence trustworthy.

## Block 2 — The quiet home (0:40-1:10, target 70 words)

In its first two weeks, it read seven hundred sixty-one real items, with
data reaching back to 2025. Thirty reached the owner, and only four of
those needed a signature. One of those four is a single recall covering
five products. Most mornings, it brought nothing. And one of those
mornings, at six A M on a Sunday, it caught a live recall expansion and
emailed the owner while nobody was watching.

## Block 3 — The consent-calendar catch (1:10-1:50, target 80 words)

This is a city council consent item. The title says: Rule twenty-A and
Rule twenty-B In-Lieu Fee Underground Utility Program. A keyword alert
would never flag it. The agent read the staff report behind the item,
and page two says they are digging up this store's street, in June of
2029. It kept the quote, and the page number, as evidence. This is the
scene that proves Shopbell is not a keyword alert.

## Block 4 — The recall catch and Resolve (1:50-2:25, target 70 words)

This one needed a signature. A metal contamination recall, covering five
ice cream flavors this store actually carries. Shopbell names the exact
flavors, the U-P-Cs, and the best-by dates to pull from the freezer
case. The owner resolves it product by product, and that action itself
becomes part of the audit trail. Two of these, the store turns out not
to carry. That goes on the record too.

## Block 5 — The overturn (2:25-3:00, target 75 words)

Shopbell also gets things wrong, and this is what that looks like. A dog
food recall, filtered as not relevant, while the store profile says pet
food is on the shelves. A genuine miss, not a staged one. The owner
overturns it: this actually affects us. That correction becomes retrieved
context. The next time a pet food recall arrives, this overturn is
sitting in front of the model when it decides.

## Block 6 — The rejection log (3:00-3:30, target 60 words)

Here is the silence, made visible. One competitor chain put out one
hundred twenty-one recall notices dated a single day. Every one was
filtered, each with one legible sentence. Sold exclusively at Albertsons.
Distributed only to Oregon and Washington. Zero interruptions. The owner
can audit any line of this, any time.

## Block 7 — Ask the radar (3:30-4:10, target 60 words)

The owner can also just ask. Why did this reach me? The same agent, on
the same database, answers from the rows it actually read, citing the
store's own profile. Show me what you filtered today. It lists them. It
runs on AgentCore sessions, it uses five database tools, and when it
doesn't know, it says so.

## Block 8 — Profile, architecture, closing (4:10-4:40, target 75 words)

The reasoning engine knows nothing about groceries. Everything grocery-
specific lives in this editable profile: eight facts, and a carry list
fifty-three entries long. Swap the profile, and the same radar watches a
salon, or a taqueria.

One Strands agent, two modes, on Amazon Bedrock AgentCore. EventBridge
wakes it every morning through Lambda, and Ty-D-B keeps every decision,
every reason, and every embedding. Shopbell. Silence you can audit.
