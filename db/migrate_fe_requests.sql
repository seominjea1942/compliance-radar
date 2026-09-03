-- FE requests 1, 2, 4 (2026-09-03)

ALTER TABLE triage_decisions ADD COLUMN IF NOT EXISTS short_reason VARCHAR(160) NULL;

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id BIGINT AUTO_RANDOM PRIMARY KEY,
    ran_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fetched INT NOT NULL,
    triaged INT NOT NULL,
    counts JSON NULL
);

-- 1. per-tag weekly table (zeros kept for all five tags)
CREATE OR REPLACE VIEW v_weekly_topics AS
SELECT t.tag,
       COUNT(d.id) AS `read`,
       COALESCE(SUM(d.decision IN ('ALERT','OPPORTUNITY')), 0) AS for_you
FROM (SELECT 'food-recalls' AS tag
      UNION ALL SELECT 'city-programs-fees'
      UNION ALL SELECT 'council-routine'
      UNION ALL SELECT 'nearby-construction'
      UNION ALL SELECT 'labor-workforce') t
LEFT JOIN triage_decisions d
       ON JSON_CONTAINS(d.tags, JSON_QUOTE(t.tag))
      AND d.created_at >= NOW() - INTERVAL 7 DAY
GROUP BY t.tag;

-- 2. trust stamp
CREATE OR REPLACE VIEW v_run_status AS
SELECT MAX(ran_at) AS last_checked FROM pipeline_runs;

-- 4. short_reason exposure
CREATE OR REPLACE VIEW v_filtered_log AS
SELECT d.id AS decision_id, doc.title, doc.source, d.reason, d.short_reason,
       d.tags, d.profile_fact_id, d.created_at, d.overturned
FROM triage_decisions d JOIN documents doc ON doc.id = d.document_id
WHERE d.decision = 'REJECT'
ORDER BY d.created_at DESC;

CREATE OR REPLACE VIEW v_surfaced_feed AS
SELECT d.id AS decision_id, doc.title, doc.source, d.decision, d.action_type,
       d.reason, d.short_reason, d.tags, d.profile_fact_id, d.created_at, doc.payload
FROM triage_decisions d JOIN documents doc ON doc.id = d.document_id
WHERE d.decision IN ('ALERT', 'OPPORTUNITY')
ORDER BY d.created_at DESC;
