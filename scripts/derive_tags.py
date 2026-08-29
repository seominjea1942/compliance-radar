"""Change 2: derive triage tag candidates from the real 90-day corpus.

Method (documented in the output file):
1. Corpus = all triaged recall documents in TiDB (90-day backfill) + 90 days of
   substantive council agenda items + 90 days of nearby building permits.
2. Embed every item title+summary with Titan V2 (1024-dim).
3. K-means clustering (k chosen by silhouette over k=6..12, pure numpy).
4. Claude labels each cluster from its top members and maps it to profile facts.
5. Output analysis/tag-candidates.md for human curation. STOP: no tags applied.
"""
import json
import os
import pathlib
import sys

import numpy as np

ROOT = pathlib.Path(__file__).parent.parent
APP = ROOT / "complianceradar" / "app" / "complianceradar"
sys.path.insert(0, str(APP))
from dotenv import dotenv_values
for k, v in dotenv_values(ROOT / ".env.local").items():
    os.environ.setdefault(k, (v or "").strip('"'))

from radar import db, legistar, permits
from radar.pipeline import embed

OUT = ROOT / "analysis" / "tag-candidates.md"
OUT.parent.mkdir(exist_ok=True)

# ---- 1. corpus ----
conn = db.connect()
with conn.cursor() as c:
    c.execute("""SELECT doc.id, doc.source, doc.title, d.embedding
                 FROM documents doc JOIN triage_decisions d ON d.document_id = doc.id
                 WHERE d.embedding IS NOT NULL""")
    rows = c.fetchall()
corpus = [{"source": r[1], "title": r[2], "emb": json.loads(r[3])} for r in rows]
print(f"recalls (from TiDB backfill): {len(corpus)}")

council = legistar.fetch_items(days_back=90)
print(f"council items: {len(council)}")
permit_items = permits.nearby(permits.fetch_items(days_back=90), radius_m=1500)
print(f"nearby permits (1500m): {len(permit_items)}")

for it in council + permit_items:
    text = it["title"] + " " + (it.get("matter_type") or it.get("work_category") or "")
    corpus.append({"source": it["source"], "title": it["title"], "emb": embed(text)})
print(f"total corpus: {len(corpus)}")

X = np.array([c["emb"] for c in corpus])
X = X / np.linalg.norm(X, axis=1, keepdims=True)

# ---- 2. k-means with silhouette-based k ----
def kmeans(X, k, iters=50, seed=0):
    rng = np.random.default_rng(seed)
    centers = X[rng.choice(len(X), k, replace=False)]
    for _ in range(iters):
        d = ((X[:, None, :] - centers[None, :, :]) ** 2).sum(-1)
        labels = d.argmin(1)
        new = np.array([X[labels == i].mean(0) if (labels == i).any() else centers[i]
                        for i in range(k)])
        if np.allclose(new, centers):
            break
        centers = new
    return labels, centers

def silhouette(X, labels):
    # sampled silhouette for speed
    idx = np.random.default_rng(1).choice(len(X), min(300, len(X)), replace=False)
    s = []
    for i in idx:
        same = X[labels == labels[i]]
        a = np.linalg.norm(same - X[i], axis=1).mean() if len(same) > 1 else 0
        bs = [np.linalg.norm(X[labels == l] - X[i], axis=1).mean()
              for l in set(labels) if l != labels[i] and (labels == l).any()]
        b = min(bs) if bs else 0
        s.append((b - a) / max(a, b) if max(a, b) > 0 else 0)
    return float(np.mean(s))

# Per-source clustering: recalls outnumber civic items ~3:1, so a global
# k-means collapses all council+permit items into one "misc" cluster. Cluster
# each source group separately, then let the labeler merge across groups.
def best_k(Xg, lo, hi):
    best = None
    for k in range(lo, min(hi, len(Xg)) + 1):
        labels, _ = kmeans(Xg, k)
        score = silhouette(Xg, labels)
        print(f"  k={k}: silhouette={score:.3f}")
        if best is None or score > best[2]:
            best = (k, labels, score)
    return best

groups = {
    "recalls": ([i for i, c in enumerate(corpus) if c["source"] in ("fda_rss", "openfda_enforcement")], 4, 8),
    "council": ([i for i, c in enumerate(corpus) if c["source"] == "legistar"], 3, 6),
    "permits": ([i for i, c in enumerate(corpus) if c["source"] == "permits"], 2, 4),
}
global_labels = [None] * len(corpus)
next_id = 0
chosen = {}
for gname, (idxs, lo, hi) in groups.items():
    print(f"{gname} ({len(idxs)} items):")
    k, labels, score = best_k(X[idxs], lo, hi)
    chosen[gname] = (k, score)
    for local_i, corpus_i in enumerate(idxs):
        global_labels[corpus_i] = next_id + labels[local_i]
    next_id += k
    print(f"  chosen k={k} (silhouette {score:.3f})")
k = next_id
labels = np.array(global_labels)
score_desc = ", ".join(f"{g}: k={v[0]} (sil {v[1]:.3f})" for g, v in chosen.items())

# ---- 3. describe clusters for labeling ----
clusters = []
for i in range(k):
    members = [corpus[j] for j in range(len(corpus)) if labels[j] == i]
    if not members:
        continue
    by_source = {}
    for m in members:
        by_source[m["source"]] = by_source.get(m["source"], 0) + 1
    clusters.append({"cluster": i, "count": len(members), "sources": by_source,
                     "sample_titles": [m["title"][:110] for m in members[:12]]})

profile = json.loads((APP / "radar" / "store_profile.json").read_text())
facts = [{"id": f["id"], "fact": f["fact"]} for f in profile["facts"]]

from strands import Agent
from strands.models import BedrockModel
model = BedrockModel(model_id="us.anthropic.claude-haiku-4-5-20251001-v1:0",
                     region_name="us-west-2", temperature=0.0, streaming=False)
labeler = Agent(model=model, callback_handler=None, system_prompt=(
    "You label topic clusters for a compliance radar serving one small grocery store. "
    "Given clusters of real items and the store's profile facts, propose 5-8 FIXED tags "
    "(short, owner-readable, e.g. 'food safety', 'labor', 'parking/access'). Rules: "
    "(1) Every cluster belongs to EXACTLY ONE tag; tags partition the clusters, no overlap. "
    "(2) The tag set must span all three sources (recalls, council items, permits), because "
    "the UI uses one fixed set across the whole app. "
    "(3) Map civic clusters to profile facts thoughtfully: nearby construction/permit "
    "clusters relate to the parking/deliveries fact; wage, pay-plan, or employment items "
    "to the employees fact; alcohol licensing to the alcohol fact; sidewalk/outdoor-use "
    "items to the sidewalk_display fact. Only mark a cluster unmapped when no fact could "
    "plausibly apply even indirectly. "
    "For each tag give: name, cluster ids covered, item_count (sum), 3 example titles, "
    "connected profile_fact_ids (empty list if none). Also list any cluster with more than "
    "10 items whose theme maps to NO profile fact under 'unmapped', with a "
    "suggested_profile_fact phrased as a store fact the owner could add. "
    "Respond with ONLY JSON: {\"tags\": [{\"name\", \"clusters\", \"item_count\", "
    "\"examples\", \"profile_fact_ids\"}], \"unmapped\": [{\"cluster\", \"count\", "
    "\"theme\", \"suggested_profile_fact\"}]}"))
resp = str(labeler("PROFILE FACTS:\n" + json.dumps(facts) +
                   "\n\nCLUSTERS:\n" + json.dumps(clusters, indent=1))).strip()
if resp.startswith("```"):
    resp = resp.strip("`").removeprefix("json").strip()
result = json.loads(resp)

# ---- 4. write report ----
lines = ["# Triage tag candidates (derived from real 90-day data)", "",
         "STATUS: CANDIDATES ONLY. Human curates the final set; nothing applied to production.",
         "",
         "## Method",
         f"- Corpus: {len(rows)} triaged recall documents (TiDB backfill), "
         f"{len(council)} substantive City Council agenda items (90d), "
         f"{len(permit_items)} building permits within 1500m of the store (90d).",
         "- Titan V2 embeddings (1024-dim, normalized), pure-numpy k-means run "
         f"PER SOURCE GROUP to avoid recall-volume dominance ({score_desc}); "
         "the labeling step merges clusters across groups into unified tags.",
         "- Claude Haiku labeled clusters and mapped them to profile facts; merges noted below.",
         ""]
lines.append("## Candidate tags\n")
for t in result.get("tags", []):
    lines.append(f"### {t['name']}")
    lines.append(f"- Item count in backfill: {t['item_count']} (clusters {t['clusters']})")
    lines.append(f"- Connected profile facts: {', '.join(t['profile_fact_ids']) or 'none'}")
    lines.append("- Examples:")
    for e in t["examples"][:3]:
        lines.append(f"  - {e}")
    lines.append("")
lines.append("## Large clusters with NO matching profile fact (possible missing facts)\n")
unmapped = result.get("unmapped", [])
if not unmapped:
    lines.append("None flagged.")
for u in unmapped:
    lines.append(f"- Cluster {u['cluster']} ({u['count']} items): {u['theme']}. "
                 f"Suggested fact: {u.get('suggested_profile_fact', 'n/a')}")
lines.append("\n## Raw cluster inventory (for auditing the grouping)\n")
for c in clusters:
    lines.append(f"- Cluster {c['cluster']}: {c['count']} items, sources {c['sources']}")
    for t in c["sample_titles"][:3]:
        lines.append(f"    - {t}")
OUT.write_text("\n".join(lines))
print(f"\nWrote {OUT}")
conn.close()
