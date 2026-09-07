"""TiDB access layer (runtime copy). Credentials come from environment variables."""
import json
import os
import pathlib

import certifi
import pymysql

SCHEMA = pathlib.Path(__file__).parent / "schema.sql"


def connect():
    return pymysql.connect(
        host=os.environ["TIDB_HOST"], port=int(os.environ.get("TIDB_PORT", "4000")),
        user=os.environ["TIDB_USER"], password=os.environ["TIDB_PASSWORD"].strip('"'),
        database=os.environ.get("TIDB_DATABASE", "compliance_radar"),
        ssl={"ca": certifi.where()}, connect_timeout=10, autocommit=True)


def upsert_document(conn, item: dict) -> int:
    with conn.cursor() as c:
        c.execute(
            """INSERT INTO documents (source, doc_type, external_id, title, payload)
               VALUES (%s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE title = VALUES(title), payload = VALUES(payload),
                                       id = LAST_INSERT_ID(id)""",
            (item["source"], item["type"], item.get("external_id"),
             item.get("title", "")[:2000], json.dumps(item)))
        return c.lastrowid


FIXED_TAGS = {"food-recalls", "city-programs-fees", "council-routine",
              "nearby-construction", "labor-workforce"}


ACTION_TYPES = {"act", "verify", "fyi"}


# fallback tag by source so no decision is ever unreachable by topic filter
DEFAULT_TAG_BY_SOURCE = {
    "fda_rss": "food-recalls", "openfda_enforcement": "food-recalls",
    "fsis_email": "food-recalls", "legistar": "council-routine",
    "permits": "nearby-construction", "street_work": "nearby-construction",
}


def insert_decision(conn, document_id: int, decision: dict, embedding=None,
                    source: str = None) -> int:
    tags = [t for t in (decision.get("tags") or []) if t in FIXED_TAGS]
    if not tags and source in DEFAULT_TAG_BY_SOURCE:
        tags = [DEFAULT_TAG_BY_SOURCE[source]]
    action = decision.get("action_type")
    if decision["decision"] == "REJECT" or action not in ACTION_TYPES:
        action = None
    with conn.cursor() as c:
        c.execute(
            """INSERT INTO triage_decisions
               (document_id, decision, reason, short_reason, hazard, profile_fact_id, embedding, tags, action_type)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (document_id, decision["decision"], decision["reason"],
             (decision.get("short_reason") or None) and decision["short_reason"][:160],
             (decision.get("hazard") or None) and str(decision["hazard"])[:60],
             decision.get("profile_fact_id"),
             json.dumps(embedding) if embedding else None,
             json.dumps(tags) if tags else None,
             action))
        return c.lastrowid


def get_profile(conn) -> dict | None:
    """Live store profile from the DB (the UI edits this row); None if missing."""
    with conn.cursor() as c:
        c.execute("SELECT profile FROM store_profile WHERE id = 1")
        row = c.fetchone()
    return json.loads(row[0]) if row else None


def similar_past_decisions(conn, embedding, k: int = 5):
    """Nearest past decisions as triage context.

    "Just curious" overturns are excluded from the learning signal: they read
    as not-overturned here so they never push future triage toward ALERT.
    """
    with conn.cursor(pymysql.cursors.DictCursor) as c:
        c.execute(
            """SELECT d.decision, d.reason, d.profile_fact_id,
                      (d.overturned AND COALESCE(d.overturn_reason_type, '') <> 'curious')
                          AS overturned,
                      d.overturn_note, doc.title,
                      VEC_COSINE_DISTANCE(d.embedding, %s) AS dist
               FROM triage_decisions d JOIN documents doc ON doc.id = d.document_id
               WHERE d.embedding IS NOT NULL
               ORDER BY dist ASC LIMIT %s""",
            (json.dumps(embedding), k))
        return list(c.fetchall())


OVERTURN_REASONS = ("affects_us", "always_show", "curious", "other")


def revert_overturn(conn, decision_id: int):
    """Undo an overturn: the item returns to plain filtered (set-aside) state
    and drops out of the learning signal."""
    with conn.cursor() as c:
        c.execute(
            """UPDATE triage_decisions
               SET overturned = FALSE, overturned_at = NULL,
                   overturn_reason_type = NULL, overturn_note = NULL
               WHERE id = %s""", (decision_id,))


def apply_overturn(conn, decision_id: int, reason_type: str, note: str = None):
    """Owner overturns a rejection. reason_type: affects_us | always_show | curious | other."""
    if reason_type not in OVERTURN_REASONS:
        raise ValueError(f"reason_type must be one of {OVERTURN_REASONS}")
    with conn.cursor() as c:
        c.execute(
            """UPDATE triage_decisions
               SET overturned = TRUE, overturned_at = NOW(),
                   overturn_reason_type = %s, overturn_note = %s
               WHERE id = %s""",
            (reason_type, note, decision_id))
