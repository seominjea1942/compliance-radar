# TODO

## Before making the repo public (blocking)
- [x] Rotate the TiDB password — DONE 2026-09-08 (old value in git history is dead).
- [x] TIDB_PASSWORD removed from agentcore.json; runtime reads Secrets Manager
      (compliance-radar/tidb-password) — DONE 2026-09-08.
- [x] .env.local (both worktrees) + Vercel env updated — DONE 2026-09-08.

## Deferred product decisions (need human call)
- [x] Store street address in profile — DONE 2026-09-03 (1287 Lincoln Ave).
- [x] Carry-list freeze LIFTED 2026-09-05 with owner sign-off; profile edits
      are a supported write path (see contract). Freeze evidence remains in
      git history (60b0aa8).
- [ ] Tag set follow-ups: alcohol/SNAP tags when a source produces real items.
- [ ] Alert-dismissal learning (roadmap; overturned rejections remain the only
      learning signal for now).

## In progress / handoffs
- [ ] FE: remove the 7-day date filter from the action tabs (Needs action /
      To check / For the file) per corrected contract rule 2026-09-05; show
      item age instead. Stats views stay weekly.
- [ ] Permit map redesign: answer "is anything about to block my
      sidewalk/street/parking", not "how many permits in a radius"
      (FE finding 2026-09-05; BE dataset investigation below).

## Deferred build items
- [ ] Tag filter indexing: JSON_CONTAINS is a table scan (45ms @ 576 rows,
      fine for now per FE2 measurement 2026-09-05); if the log grows large,
      add a generated tag column + index.
- [ ] Recall expiry by termination status: ingest openFDA `status`
      (Ongoing/Completed/Terminated) and close items when the recall
      terminates, instead of any time-based aging (decided 2026-09-05).
- [ ] Federal Register source (only if screens finish early; first in cut order).
- [ ] Least-privilege IAM key (bedrock:InvokeModel only) for the Vercel brief
      endpoint, when FE wires it.
- [ ] AWS goodwill-credit support case for the $30 token incident (draft on request).
