-- Compliance Radar schema (TiDB Cloud Serverless)
-- Embeddings: Bedrock Titan Text Embeddings V2, 1024 dims.

CREATE TABLE IF NOT EXISTS documents (
    id BIGINT AUTO_RANDOM PRIMARY KEY,
    source VARCHAR(50) NOT NULL,          -- fda_rss | openfda_enforcement | fsis_email | legistar | permits | fedreg
    doc_type VARCHAR(50) NOT NULL,
    external_id VARCHAR(200),             -- recall_number, EventItemId, FOLDERNUM, S3 key...
    title TEXT NOT NULL,
    payload JSON NOT NULL,                -- full normalized item
    fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_source_external (source, external_id)
);

CREATE TABLE IF NOT EXISTS triage_decisions (
    id BIGINT AUTO_RANDOM PRIMARY KEY,
    document_id BIGINT NOT NULL,
    decision VARCHAR(20) NOT NULL,        -- ALERT | REJECT | OPPORTUNITY
    reason TEXT NOT NULL,                 -- the one-line rejection-log reason
    profile_fact_id VARCHAR(50),          -- which store fact drove it
    embedding VECTOR(1024),               -- of title + reason, for similar-past-decision retrieval
    overturned BOOLEAN NOT NULL DEFAULT FALSE,
    overturned_at DATETIME NULL,
    overturn_note TEXT NULL,              -- owner's note, feeds future triage context
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_decision_created (decision, created_at)
);

CREATE TABLE IF NOT EXISTS store_profile (
    id INT PRIMARY KEY DEFAULT 1,
    profile JSON NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
