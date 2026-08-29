"""Update 03: ingest council items (two-stage) and nearby permits into TiDB.

New items only; existing stored decisions are never touched. Reports what
triage organically decided for the demo-week items (m16131, m16125).
"""
import json
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

from radar import db, legistar, permits
from radar.pipeline import embed, make_agent, triage_with_context, PROFILE_PATH
from radar.council_triage import triage_council_item

profile = json.loads(PROFILE_PATH.read_text())
conn = db.connect()
with conn.cursor() as c:
    c.execute("SELECT source, external_id FROM documents")
    seen = {(r[0], r[1]) for r in c.fetchall()}

# ---- council ----
council = [it for it in legistar.fetch_items(days_back=90)
           if ("legistar", it["external_id"]) not in seen]
print(f"council items to triage: {len(council)}")
watch = {}
for it in council:
    decision, extras = triage_council_item(it, profile)
    it.update(extras)
    emb = embed(it["title"] + " " + (it.get("matter_type") or ""))
    doc_id = db.upsert_document(conn, it)
    db.insert_decision(conn, doc_id, decision, emb)
    mark = "**" if it["matter_id"] in (16131, 16125) else "  "
    if it["matter_id"] in (16131, 16125):
        watch[it["matter_id"]] = (decision, extras)
    print(f"{mark}{decision['decision']:11} [{it.get('triage_stage')}] {it['title'][:70]}")
    if decision["decision"] != "REJECT" or it["matter_id"] in (16131, 16125):
        print(f"    reason: {decision['reason'][:140]}")
        if extras.get("key_dates"):
            print(f"    key_dates: {extras['key_dates']}")
    time.sleep(0.3)

# ---- permits (within 1500m, for the map) ----
near = [it for it in permits.nearby(permits.fetch_items(days_back=90), 1500)
        if ("permits", it["external_id"]) not in seen]
print(f"\nnearby permits to triage: {len(near)}")
agent = make_agent()
counts = {}
for it in near:
    emb = embed(it["title"])
    past = db.similar_past_decisions(conn, emb, k=5)
    decision = triage_with_context(agent, it, profile, past)
    doc_id = db.upsert_document(conn, it)
    db.insert_decision(conn, doc_id, decision, emb)
    counts[decision["decision"]] = counts.get(decision["decision"], 0) + 1
print(f"permit decisions: {counts}")

print("\n==== demo-week check ====")
for mid, (decision, extras) in watch.items():
    print(f"m{mid}: {decision['decision']} | {decision['reason'][:150]}")
    print(f"   dates: {extras.get('key_dates')} | evidence: {json.dumps(extras.get('evidence'))[:220]}")
conn.close()
