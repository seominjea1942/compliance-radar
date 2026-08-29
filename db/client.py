"""TiDB access layer: connection, schema init, document + decision writes,
and vector search over past decisions (the rejection-learning retrieval)."""
import json
import pathlib

import certifi
import pymysql
from dotenv import dotenv_values

ROOT = pathlib.Path(__file__).parent.parent
SCHEMA = pathlib.Path(__file__).parent / "schema.sql"


def connect(with_db: bool = True):
    import os
    cfg = {**dotenv_values(ROOT / ".env.local"),
           **{k: v for k, v in os.environ.items() if k.startswith("TIDB_")}}
    return pymysql.connect(
        host=cfg["TIDB_HOST"], port=int(cfg["TIDB_PORT"]),
        user=cfg["TIDB_USER"], password=cfg["TIDB_PASSWORD"].strip('"'),
        database=cfg["TIDB_DATABASE"] if with_db else None,
        ssl={"ca": certifi.where()}, connect_timeout=10, autocommit=True)


def init_schema():
    conn = connect()
    with conn.cursor() as c:
        for stmt in SCHEMA.read_text().split(";"):
            if stmt.strip():
                c.execute(stmt)
    conn.close()


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


def insert_decision(conn, document_id: int, decision: dict, embedding: list[float] | None = None) -> int:
    with conn.cursor() as c:
        c.execute(
            """INSERT INTO triage_decisions
               (document_id, decision, reason, profile_fact_id, embedding)
               VALUES (%s, %s, %s, %s, %s)""",
            (document_id, decision["decision"], decision["reason"],
             decision.get("profile_fact_id"),
             json.dumps(embedding) if embedding else None))
        return c.lastrowid


def similar_past_decisions(conn, embedding: list[float], k: int = 5) -> list[dict]:
    """Nearest past decisions by cosine distance; context for new triage calls."""
    with conn.cursor(pymysql.cursors.DictCursor) as c:
        c.execute(
            """SELECT d.decision, d.reason, d.profile_fact_id, d.overturned, d.overturn_note,
                      doc.title,
                      VEC_COSINE_DISTANCE(d.embedding, %s) AS dist
               FROM triage_decisions d JOIN documents doc ON doc.id = d.document_id
               WHERE d.embedding IS NOT NULL
               ORDER BY dist ASC LIMIT %s""",
            (json.dumps(embedding), k))
        return list(c.fetchall())


if __name__ == "__main__":
    init_schema()
    conn = connect()
    with conn.cursor() as c:
        c.execute("SHOW TABLES")
        print("Tables:", [r[0] for r in c.fetchall()])
    conn.close()
