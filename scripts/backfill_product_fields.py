"""Fix truncated titles (refetch openFDA by recall_number), add code_info and
product_quantity to payloads, then extract structured product fields for all
openFDA recall documents. Deterministic repair + copy-only LLM extraction."""
import datetime, json, os, pathlib, sys, urllib.request
ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "complianceradar" / "app" / "complianceradar"))
from dotenv import dotenv_values
for k, v in dotenv_values(ROOT / ".env.local").items():
    os.environ.setdefault(k, (v or "").strip('"'))
from radar import db
from radar.product_extract import extract_products

UA = {"User-Agent": "compliance-radar/0.1 (hackathon)"}
end = datetime.date.today(); start = end - datetime.timedelta(days=130)
full = {}
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
            full[r["recall_number"]] = r
    if len(batch) < 100:
        break
print(f"openFDA records refetched: {len(full)}")

conn = db.connect()
with conn.cursor() as c:
    c.execute("SELECT id, payload FROM documents WHERE source='openfda_enforcement'")
    rows = c.fetchall()
repaired, todo = 0, []
with conn.cursor() as c:
    for did, payload in rows:
        p = json.loads(payload)
        rec = full.get(p.get("recall_number"))
        if rec:
            p["title"] = rec.get("product_description", p["title"])[:1800]
            p["code_info"] = rec.get("code_info", "")[:1500]
            p["product_quantity"] = rec.get("product_quantity", "")
            repaired += 1
        todo.append((did, p))
    # extraction over full titles
    ext = extract_products([{"id": str(did), "text": p["title"]} for did, p in todo])
    for did, p in todo:
        p["product"] = ext.get(str(did))
        c.execute("UPDATE documents SET payload=%s, title=%s WHERE id=%s",
                  (json.dumps(p), p["title"][:2000], did))
print(f"payloads repaired: {repaired}; products extracted: {len(ext)}")

# fill-rate report
stats = {"brand": 0, "product_name": 0, "sizes": 0, "upcs": 0, "containers": 0,
         "code_info": 0, "product_quantity": 0}
n = len(todo)
for _, p in todo:
    pr = p.get("product") or {}
    for k in ("brand", "product_name"):
        stats[k] += bool(pr.get(k))
    for k in ("sizes", "upcs", "containers"):
        stats[k] += bool(pr.get(k))
    stats["code_info"] += bool(p.get("code_info"))
    stats["product_quantity"] += bool(p.get("product_quantity"))
print(f"\nFILL RATES over {n} openFDA recall documents:")
for k, v in stats.items():
    print(f"  {k:16} {v:>3}/{n}  ({100*v/n:.0f}%)")
conn.close()
