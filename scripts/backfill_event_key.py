"""One-time: stamp event_key into existing recall document payloads.

openFDA enforcement: refetch the 90d window and map recall_number -> event_id
(deterministic, zero LLM). Fallback: firm + initiation date. RSS: the press
release link. FSIS/other: external_id (already one event per doc).
"""
import datetime, json, os, pathlib, sys, urllib.request
ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "complianceradar" / "app" / "complianceradar"))
from dotenv import dotenv_values
for k, v in dotenv_values(ROOT / ".env.local").items():
    os.environ.setdefault(k, (v or "").strip('"'))
from radar import db

# build recall_number -> event_id map from openFDA (paginated, wide window)
UA = {"User-Agent": "compliance-radar/0.1 (hackathon)"}
end = datetime.date.today(); start = end - datetime.timedelta(days=120)
m = {}
for page in range(6):
    url = ("https://api.fda.gov/food/enforcement.json"
           f"?search=report_date:[{start:%Y%m%d}+TO+{end:%Y%m%d}]&limit=100&skip={page*100}")
    try:
        data = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read())
    except Exception:
        break
    batch = data.get("results", [])
    for r in batch:
        if r.get("recall_number"):
            m[r["recall_number"]] = r.get("event_id")
    if len(batch) < 100:
        break
print(f"event_id map entries: {len(m)}")

conn = db.connect()
with conn.cursor() as c:
    c.execute("SELECT id, source, external_id, payload FROM documents WHERE source IN ('openfda_enforcement','fda_rss','fsis_email')")
    rows = c.fetchall()
    updated = 0
    for did, source, ext, payload in rows:
        p = json.loads(payload)
        if p.get("event_key"):
            continue
        if source == "openfda_enforcement":
            rn = p.get("recall_number")
            ek = (rn and m.get(rn)) or f"evt-{p.get('recalling_firm','')[:40]}-{p.get('recall_initiation_date','')}".replace(" ", "_")
        elif source == "fda_rss":
            ek = p.get("link") or ext
        else:
            ek = ext
        p["event_key"] = str(ek)
        c.execute("UPDATE documents SET payload=%s WHERE id=%s", (json.dumps(p), did))
        updated += 1
print(f"stamped event_key on {updated} documents")
with conn.cursor() as c:
    c.execute("""SELECT event_key, COUNT(*) n, LEFT(MIN(title),50) FROM v_surfaced_feed
                 GROUP BY event_key HAVING n > 1 ORDER BY n DESC LIMIT 6""")
    print("multi-item surfaced events:")
    for r in c.fetchall(): print(f"  {r[1]} items | {r[0][:40]} | {r[2]}")
conn.close()
