# TODO

## Before making the repo public (blocking)
- [ ] Rotate the TiDB password (TiDB Cloud console -> cluster -> Connect ->
      Reset password). The current password is in git history
      (complianceradar/agentcore/agentcore.json, since commit 60b0aa8), so it
      must be dead before the repo is public.
- [ ] Remove TIDB_PASSWORD from agentcore.json envVars; have the runtime read
      it from AWS Secrets Manager (~$0.40/mo) or a deploy-time injection.
- [ ] Update .env.local + Vercel env with the new password.

## Deferred product decisions (need human call)
- [x] Store street address in profile — DONE 2026-09-03 (1287 Lincoln Ave).
- [x] Carry-list freeze LIFTED 2026-09-05 with owner sign-off; profile edits
      are a supported write path (see contract). Freeze evidence remains in
      git history (60b0aa8).
- [ ] Tag set follow-ups: alcohol/SNAP tags when a source produces real items.
- [ ] Alert-dismissal learning (roadmap; overturned rejections remain the only
      learning signal for now).

## Deferred build items
- [ ] Federal Register source (only if screens finish early; first in cut order).
- [ ] Least-privilege IAM key (bedrock:InvokeModel only) for the Vercel brief
      endpoint, when FE wires it.
- [ ] AWS goodwill-credit support case for the $30 token incident (draft on request).

## Frontend: shipping (not started)
- [ ] Deploy the web app to Vercel. Nothing has run anywhere but localhost, so
      the env wiring, the `nodejs` runtime pin on /api/ask and the serverless
      driver in a real lambda are all untested. Root Directory = `web`; set
      `DATABASE_URL` (or the five TIDB_* vars, which lib/db.ts assembles).
- [ ] Merge fe/home-screen and be/workspace into master. 40 + 12 commits sit on
      branches with no PRs, so master still shows only the conventions commit.
- [ ] Set `AGENT_RUNTIME_ARN` + `AWS_REGION` + the least-privilege key in the
      Vercel env. Ask the radar is wired and returns "Ask isn't configured on
      this deployment yet" until they exist (this is the FE half of the
      least-privilege IAM key item above, which Ask now needs as well as brief).

## Frontend: waiting on backend
- [ ] `payload` on `v_filtered_log`, or a `v_decision_detail` covering surfaced
      and filtered rows. Without it /item/<id> can show provenance for surfaced
      items but not filtered ones, and log cards cannot show the product line
      the overview does.
- [ ] Carry-list entries carry only {category, brands, carries}. The profile
      reference also shows a Categories column and a "prep only" qualifier;
      both are omitted rather than invented. Wants `categories[]` and an
      optional qualifier per entry.
- [ ] 20 of 41 surfaced recall titles are still at the old 200-char cap (max is
      now 542), so the untruncate/refetch repair looks partially applied.
- [ ] A pathogen flag on the decision would replace the narrow keyword list the
      feed currently uses to rank Class I / pathogen verify items above
      ordinary ones (lib/queries.ts, PATHOGENS).
- [ ] Coverage note: product_name and code_info measure ~93% on the 41 surfaced
      recall rows, not 100%. Headlines fall back to the source title, so this
      is informational rather than blocking.

## Frontend: not built
- [ ] Briefs (artboards 11/12) and the mobile artboards (13/14) were scoped
      out: briefs render in email, mobile is handled by the responsive layout.
- [ ] "Share via email" and "Didn't need this" are inert buttons; no write path
      exists for either.
- [ ] Sources and Settings were removed from the rail rather than built.

