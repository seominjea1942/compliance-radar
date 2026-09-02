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
- [ ] Store street address in profile (fixes the Rule 20A Lincoln Ave miss and
      the residential permit-anchor noise); then re-triage the 62 council items.
- [ ] Tag set follow-ups: alcohol/SNAP tags when a source produces real items.
- [ ] Alert-dismissal learning (roadmap; overturned rejections remain the only
      learning signal for now).

## Deferred build items
- [ ] Federal Register source (only if screens finish early; first in cut order).
- [ ] Least-privilege IAM key (bedrock:InvokeModel only) for the Vercel brief
      endpoint, when FE wires it.
- [ ] AWS goodwill-credit support case for the $30 token incident (draft on request).
