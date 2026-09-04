-- Resolve flow (2026-09-03): per-item resolution on surfaced decisions.
ALTER TABLE triage_decisions ADD COLUMN IF NOT EXISTS resolution VARCHAR(20) NULL;
ALTER TABLE triage_decisions ADD COLUMN IF NOT EXISTS resolved_at DATETIME NULL;

CREATE OR REPLACE VIEW v_surfaced_feed AS
SELECT d.id AS decision_id, doc.title, doc.source, d.decision, d.action_type,
       d.reason, d.short_reason, d.tags, d.profile_fact_id, d.created_at,
       d.resolution, d.resolved_at,
       COALESCE(doc.payload->>'$.event_key', doc.external_id) AS event_key,
       doc.payload
FROM triage_decisions d JOIN documents doc ON doc.id = d.document_id
WHERE d.decision IN ('ALERT', 'OPPORTUNITY')
ORDER BY d.created_at DESC;
