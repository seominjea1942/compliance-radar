"""One-time: generate short_reason (<=100 chars, one clause) for all existing
decisions. Original reason column untouched (integrity rules)."""
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
    "Compress each triage reason to a short_reason: max 100 characters, ONE "
    "clause, only the decisive fact. Never restate the store name ('Willow "
    "Glen Family Market'), the product category label, or the recall class; "
    "the UI shows those already. Examples: 'Distributed only to OR' / "
    "'Carried brand, CA distribution' / 'Sold exclusively at Albertsons' / "
    "'City payroll classification, not private wage law'.\n"
    "Respond ONLY with JSON {\"<id>\": \"<short_reason>\", ...} covering every id."))

conn = db.connect()
with conn.cursor() as c:
    c.execute("SELECT id, LEFT(reason, 300) FROM triage_decisions WHERE short_reason IS NULL")
    rows = c.fetchall()
print(f"to compress: {len(rows)}")
for i in range(0, len(rows), 25):
    batch = rows[i:i+25]
    clf.messages = []
    resp = str(clf(json.dumps([{"id": r[0], "reason": r[1]} for r in batch]))).strip()
    if resp.startswith("```"):
        resp = resp.strip("`").removeprefix("json").strip()
    m = re.search(r"\{.*\}", resp, re.S)
    out = json.loads(m.group(0)) if m else {}
    with conn.cursor() as c:
        for r in batch:
            sr = (out.get(str(r[0])) or "").strip()
            if sr:
                c.execute("UPDATE triage_decisions SET short_reason=%s WHERE id=%s", (sr[:160], r[0]))
    if (i // 25) % 5 == 0:
        print(f"  {min(i+25, len(rows))}/{len(rows)}")
with conn.cursor() as c:
    c.execute("SELECT COUNT(*), AVG(CHAR_LENGTH(short_reason)) FROM triage_decisions WHERE short_reason IS NOT NULL")
    n, avg = c.fetchone()
    print(f"done: {n} rows, avg {float(avg):.0f} chars")
    c.execute("SELECT LEFT(reason,70), short_reason FROM triage_decisions WHERE short_reason IS NOT NULL ORDER BY RAND(7) LIMIT 4")
    for r in c.fetchall(): print(f"  '{r[1]}'  <=  {r[0]}...")
conn.close()
