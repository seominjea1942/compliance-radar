"""One-time: hazard field (max 5 words, compressed-not-invented) for surfaced
recall rows. Uses the record's own reason_for_recall; no fabrication."""
import json, os, pathlib, re, sys
ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "complianceradar" / "app" / "complianceradar"))
from dotenv import dotenv_values
for k, v in dotenv_values(ROOT / ".env.local").items():
    os.environ.setdefault(k, (v or "").strip('"'))
from radar import db
from strands import Agent
from strands.models import BedrockModel

model = BedrockModel(model_id="us.anthropic.claude-haiku-4-5-20251001-v1:0",
                     region_name="us-west-2", temperature=0.0, streaming=False)
clf = Agent(model=model, callback_handler=None, system_prompt=(
    "Compress each recall's stated hazard to max 5 words. Use ONLY words/facts "
    "present in the given text; compress, never invent or upgrade severity "
    "(e.g. 'Potential contamination with foreign objects (metal pieces)' -> "
    "'foreign metal pieces'; 'undeclared egg' -> 'undeclared egg allergen' is "
    "NOT allowed unless 'allergen' appears, use 'undeclared egg'). "
    "Respond ONLY with JSON {\"<id>\": \"<hazard>\", ...} covering every id."))

conn = db.connect()
with conn.cursor() as c:
    c.execute("""SELECT d.id, COALESCE(doc.payload->>'$.reason_for_recall',
                        LEFT(doc.payload->>'$.description', 200), LEFT(doc.title, 150))
                 FROM triage_decisions d JOIN documents doc ON doc.id=d.document_id
                 WHERE d.decision IN ('ALERT','OPPORTUNITY') AND d.hazard IS NULL
                   AND doc.source IN ('fda_rss','openfda_enforcement','fsis_email')""")
    rows = c.fetchall()
print(f"to compress: {len(rows)}")
for i in range(0, len(rows), 25):
    batch = rows[i:i+25]
    clf.messages = []
    resp = str(clf(json.dumps([{"id": r[0], "text": r[1]} for r in batch]))).strip()
    if resp.startswith("```"):
        resp = resp.strip("`").removeprefix("json").strip()
    m = re.search(r"\{.*\}", resp, re.S)
    out = json.loads(m.group(0)) if m else {}
    with conn.cursor() as c:
        for r in batch:
            h = (out.get(str(r[0])) or "").strip()
            if h:
                c.execute("UPDATE triage_decisions SET hazard=%s WHERE id=%s", (h[:60], r[0]))
with conn.cursor() as c:
    c.execute("""SELECT hazard, LEFT(title,50) FROM v_surfaced_feed
                 WHERE hazard IS NOT NULL ORDER BY RAND(3) LIMIT 5""")
    for r in c.fetchall(): print(f"  '{r[0]}' | {r[1]}")
conn.close()
