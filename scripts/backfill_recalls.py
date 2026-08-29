"""Backfill: 90 days of FDA recall data (RSS + paginated openFDA enforcement),
triaged with the carry-list-aware prompt and stored in TiDB.

Run from repo root: .venv/bin/python scripts/backfill_recalls.py
"""
import os
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).parent.parent
APP = ROOT / "complianceradar" / "app" / "complianceradar"
sys.path.insert(0, str(APP))

from dotenv import dotenv_values
for k, v in dotenv_values(ROOT / ".env.local").items():
    os.environ.setdefault(k, (v or "").strip('"'))

import json
from radar import db, fda_recalls
from radar.pipeline import make_agent, embed, triage_with_context, item_key, PROFILE_PATH

profile = json.loads(PROFILE_PATH.read_text())
agent = make_agent()
conn = db.connect()

items = fda_recalls.fetch_rss_items() + fda_recalls.fetch_enforcement_items(days_back=90, max_pages=5)
for it in items:
    it["external_id"] = item_key(it)
print(f"Fetched {len(items)} recall items (90-day window)")

with conn.cursor() as c:
    c.execute("SELECT source, external_id FROM documents")
    seen = {(r[0], r[1]) for r in c.fetchall()}
fresh = [it for it in items if (it["source"], it["external_id"]) not in seen]
# dedupe within batch
uniq, keys = [], set()
for it in fresh:
    k = (it["source"], it["external_id"])
    if k not in keys:
        keys.add(k)
        uniq.append(it)
print(f"New items to triage: {len(uniq)}")

counts = {}
for i, it in enumerate(uniq, 1):
    for attempt in (1, 2):
        try:
            emb = embed(it.get("title", "") + " " + it.get("reason_for_recall", it.get("description", "")))
            past = db.similar_past_decisions(conn, emb, k=5)
            decision = triage_with_context(agent, it, profile, past)
            doc_id = db.upsert_document(conn, it)
            db.insert_decision(conn, doc_id, decision, emb)
            counts[decision["decision"]] = counts.get(decision["decision"], 0) + 1
            break
        except Exception as e:
            print(f"  [retry {attempt}] {type(e).__name__}: {str(e)[:80]}")
            time.sleep(5)
    if i % 25 == 0:
        print(f"  ...{i}/{len(uniq)} done, counts so far: {counts}")

print(f"\nBackfill complete: {counts}")
conn.close()
