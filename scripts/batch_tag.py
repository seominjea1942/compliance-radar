"""Update 03 task 1: one-time batch tag pass over backfill decisions.

Adds tags (fixed 5-tag set) to triage_decisions.tags. Does NOT touch
decision, reason, or any other stored field (integrity rule 3.2).
Items are tagged in batches of 25 per LLM call.
"""
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).parent.parent
APP = ROOT / "complianceradar" / "app" / "complianceradar"
sys.path.insert(0, str(APP))
from dotenv import dotenv_values
for k, v in dotenv_values(ROOT / ".env.local").items():
    os.environ.setdefault(k, (v or "").strip('"'))

from radar import db
from radar.db import FIXED_TAGS
from strands import Agent
from strands.models import BedrockModel

model = BedrockModel(model_id="us.anthropic.claude-haiku-4-5-20251001-v1:0",
                     region_name="us-west-2", temperature=0.0, streaming=False)
tagger = Agent(model=model, callback_handler=None, system_prompt=(
    "Assign 1-2 tags to each item from EXACTLY this set: food-recalls, "
    "city-programs-fees, council-routine, nearby-construction, labor-workforce. "
    "Items are recalls, council agenda items, or building permits near a grocery "
    "store. Respond ONLY with JSON: {\"<id>\": [\"tag\", ...], ...} covering every id."))

conn = db.connect()
with conn.cursor() as c:
    c.execute("""SELECT d.id, doc.source, LEFT(doc.title, 120), LEFT(d.reason, 100)
                 FROM triage_decisions d JOIN documents doc ON doc.id=d.document_id
                 WHERE d.tags IS NULL""")
    rows = c.fetchall()
print(f"untagged decisions: {len(rows)}")

for i in range(0, len(rows), 25):
    batch = rows[i:i+25]
    payload = [{"id": r[0], "source": r[1], "title": r[2], "why": r[3]} for r in batch]
    resp = str(tagger(json.dumps(payload))).strip()
    if resp.startswith("```"):
        resp = resp.strip("`").removeprefix("json").strip()
    tags_by_id = json.loads(resp)
    with conn.cursor() as c:
        for r in batch:
            tags = [t for t in tags_by_id.get(str(r[0]), []) if t in FIXED_TAGS] or ["food-recalls"] \
                if r[1] in ("fda_rss", "openfda_enforcement") else \
                [t for t in tags_by_id.get(str(r[0]), []) if t in FIXED_TAGS]
            if tags:
                c.execute("UPDATE triage_decisions SET tags=%s WHERE id=%s",
                          (json.dumps(tags), r[0]))
    print(f"  tagged {min(i+25, len(rows))}/{len(rows)}")

with conn.cursor() as c:
    c.execute("SELECT JSON_UNQUOTE(JSON_EXTRACT(tags,'$[0]')), COUNT(*) FROM triage_decisions WHERE tags IS NOT NULL GROUP BY 1")
    print("tag distribution (primary tag):", dict(c.fetchall()))
conn.close()
