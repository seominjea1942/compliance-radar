-- action_type: act | verify | fyi, surfaced decisions only (NULL for REJECT).
ALTER TABLE triage_decisions ADD COLUMN IF NOT EXISTS action_type VARCHAR(10) NULL;

-- Surfaced feed view for the UI (was a raw query in the contract).
CREATE OR REPLACE VIEW v_surfaced_feed AS
SELECT d.id AS decision_id, doc.title, doc.source, d.decision, d.action_type,
       d.reason, d.tags, d.profile_fact_id, d.created_at, doc.payload
FROM triage_decisions d JOIN documents doc ON doc.id = d.document_id
WHERE d.decision IN ('ALERT', 'OPPORTUNITY')
ORDER BY d.created_at DESC;
