"""One-time: classify action_type (act/verify/fyi) for existing surfaced
decisions. Touches ONLY the new action_type column; decision/reason/tags
stay exactly as recorded (integrity rules)."""
import json, os, pathlib, sys
ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "complianceradar" / "app" / "complianceradar"))
from dotenv import dotenv_values
for k, v in dotenv_values(ROOT / ".env.local").items():
    os.environ.setdefault(k, (v or "").strip('"'))
from radar import db
from strands import Agent
from strands.models import BedrockModel

CARRIED_BRANDS = []
import json as _json
_profile = _json.loads((ROOT / "complianceradar" / "app" / "complianceradar" / "radar" / "store_profile.json").read_text())
for e in _profile["carry_list"]["entries"]:
    if e["carries"]:
        CARRIED_BRANDS += e["brands"]

model = BedrockModel(model_id="us.anthropic.claude-haiku-4-5-20251001-v1:0",
                     region_name="us-west-2", temperature=0.0, streaming=False)
clf = Agent(model=model, callback_handler=None, system_prompt=(
    "For each surfaced compliance item, classify action_type:\n"
    "act = the store is affected on the stated facts (carried brand named, "
    "store's premises/street named, fee lands on its bill): owner should do "
    "something now.\n"
    "verify = the reason names ONE concrete check the owner can perform "
    "(a specific product plausibly on the shelf to look for).\n"
    "fyi = awareness only; no action or concrete check (includes distant or "
    "speculative proximity items).\n"
    "act requires the recalled BRAND to appear in the store's carried-brand "
    "list below (or the store's own premises/bill to be named). A carried "
    "CATEGORY with a non-carried brand is verify at most, never act.\n"
    "CARRIED BRANDS: " + ", ".join(CARRIED_BRANDS) + "\n"
    "Respond ONLY with JSON {\"<id>\": \"act|verify|fyi\", ...} covering every id."))

conn = db.connect()
with conn.cursor() as c:
    c.execute("""SELECT d.id, doc.source, LEFT(doc.title,110), LEFT(d.reason,160)
                 FROM triage_decisions d JOIN documents doc ON doc.id=d.document_id
                 WHERE d.decision IN ('ALERT','OPPORTUNITY')""")
    rows = c.fetchall()
print(f"to classify: {len(rows)}")
for i in range(0, len(rows), 20):
    batch = rows[i:i+20]
    clf.messages = []
    resp = str(clf(json.dumps([{"id": r[0], "source": r[1], "title": r[2], "why": r[3]}
                               for r in batch]))).strip()
    if resp.startswith("```"):
        resp = resp.strip("`").removeprefix("json").strip()
    import re
    m = re.search(r"\{.*?\}", resp, re.S)
    out = json.loads(m.group(0)) if m else {}
    with conn.cursor() as c:
        for r in batch:
            a = out.get(str(r[0]))
            if a in ("act", "verify", "fyi"):
                c.execute("UPDATE triage_decisions SET action_type=%s WHERE id=%s", (a, r[0]))
with conn.cursor() as c:
    c.execute("""SELECT action_type, COUNT(*) FROM triage_decisions
                 WHERE decision IN ('ALERT','OPPORTUNITY') GROUP BY action_type""")
    print("distribution:", dict(c.fetchall()))
    c.execute("""SELECT d.action_type, LEFT(doc.title,60) FROM triage_decisions d
                 JOIN documents doc ON doc.id=d.document_id
                 WHERE d.action_type='act'""")
    print("\nact items:")
    for r in c.fetchall(): print("  ", r[0], "|", r[1])
conn.close()
