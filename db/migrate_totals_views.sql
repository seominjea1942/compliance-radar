-- All-time totals views (2026-09-08). The old v_weekly_* views stayed in
-- place until FE switched lib/queries.ts; dropped 2026-09-10:
DROP VIEW IF EXISTS v_weekly_summary;
DROP VIEW IF EXISTS v_weekly_topics;

CREATE OR REPLACE VIEW v_topic_totals AS
SELECT t.tag,
       COUNT(d.id) AS `read`,
       COALESCE(SUM(d.decision IN ('ALERT', 'OPPORTUNITY')), 0) AS for_you
FROM (SELECT 'food-recalls' AS tag
      UNION ALL SELECT 'city-programs-fees'
      UNION ALL SELECT 'council-routine'
      UNION ALL SELECT 'nearby-construction'
      UNION ALL SELECT 'labor-workforce') t
LEFT JOIN triage_decisions d
       ON JSON_CONTAINS(d.tags, JSON_QUOTE(t.tag))
GROUP BY t.tag;

CREATE OR REPLACE VIEW v_read_totals AS
SELECT doc.source,
       COUNT(*) AS reviewed,
       SUM(d.decision IN ('ALERT', 'OPPORTUNITY')) AS surfaced,
       SUM(d.decision = 'REJECT') AS filtered
FROM triage_decisions d JOIN documents doc ON doc.id = d.document_id
GROUP BY doc.source;
