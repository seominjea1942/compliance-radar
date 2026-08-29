-- Update 01 additive migration: tags, structured overturn reasons, UI views.

ALTER TABLE triage_decisions ADD COLUMN IF NOT EXISTS tags JSON NULL;
ALTER TABLE triage_decisions ADD COLUMN IF NOT EXISTS overturn_reason_type VARCHAR(20) NULL;

-- 1. Weekly review summary (home screen strip: "reviewed 94, surfaced 2")
CREATE OR REPLACE VIEW v_weekly_summary AS
SELECT doc.source,
       COUNT(*) AS reviewed,
       SUM(d.decision IN ('ALERT', 'OPPORTUNITY')) AS surfaced,
       SUM(d.decision = 'REJECT') AS filtered
FROM triage_decisions d JOIN documents doc ON doc.id = d.document_id
WHERE d.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY doc.source;

-- 2. Filtered items list (rejection log screen; reason is the primary content)
CREATE OR REPLACE VIEW v_filtered_log AS
SELECT d.id AS decision_id, doc.title, doc.source, d.reason, d.tags,
       d.profile_fact_id, d.created_at, d.overturned
FROM triage_decisions d JOIN documents doc ON doc.id = d.document_id
WHERE d.decision = 'REJECT'
ORDER BY d.created_at DESC;

-- 3. Overturn records ("curious" excluded from learning by the retrieval query,
--    not by this view; the UI still lists all overturns)
CREATE OR REPLACE VIEW v_overturns AS
SELECT d.id AS decision_id, doc.title, doc.source, d.reason AS original_reason,
       d.overturn_reason_type, d.overturn_note, d.overturned_at
FROM triage_decisions d JOIN documents doc ON doc.id = d.document_id
WHERE d.overturned = TRUE
ORDER BY d.overturned_at DESC;

-- 4. Monitored nearby permits (home map: store pin + gray watched pins)
CREATE OR REPLACE VIEW v_nearby_permits AS
SELECT doc.id AS document_id, doc.title,
       doc.payload->>'$.lat' AS lat, doc.payload->>'$.lon' AS lon,
       doc.payload->>'$.status' AS status,
       doc.payload->>'$.distance_from_store_m' AS distance_from_store_m,
       doc.payload->>'$.issue_date' AS issue_date,
       d.decision, d.reason
FROM documents doc LEFT JOIN triage_decisions d ON d.document_id = doc.id
WHERE doc.source = 'permits'
  AND doc.payload->>'$.lat' IS NOT NULL
ORDER BY CAST(doc.payload->>'$.distance_from_store_m' AS UNSIGNED);
