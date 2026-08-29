"""Daily triage pass (runtime copy): fetch, triage with past-decision context, store."""
import json
import pathlib

import boto3
from strands import Agent
from strands.models import BedrockModel

from radar import db
from radar import fda_recalls

PROFILE_PATH = pathlib.Path(__file__).parent / "store_profile.json"
EMBED_MODEL = "amazon.titan-embed-text-v2:0"
TRIAGE_MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0"

TRIAGE_SYSTEM = """You are a compliance triage engine for one specific small business.
You receive one item (a recall, agenda item, permit, or rule) and the business profile.
Decide whether this item genuinely affects THIS business.

Respond with ONLY a JSON object, no other text:
{
  "decision": "ALERT" | "REJECT" | "OPPORTUNITY",
  "reason": "<one sentence, citing the specific profile fact that drove the decision>",
  "profile_fact_id": "<id of the profile fact that drove the decision, or null>",
  "tags": ["<1-2 tags from EXACTLY this fixed set: food-recalls, city-programs-fees, council-routine, nearby-construction, labor-workforce>"]
}

Default to REJECT. Silence is the product: only ALERT when the item plausibly
requires the owner to look at it. An overly chatty radar is a broken radar.
Never give legal advice; you flag items for a human to review.

For RECALL items, when the profile includes a carry list ("what we carry"),
check the recalled product against it and cite the match in your reason:
if the store carries that category or brand, that argues for ALERT ("recall is
[brand] deli meat, which the store carries"); if the store does not carry the
category, that argues for REJECT ("shellfish recall, store does not carry
seafood"). The carry list is category/brand level, not SKU inventory, so treat
a category match as "plausibly on the shelf," not certainty.
An explicit "carries: false" entry is authoritative: when the recalled product
belongs to a category the list marks as not carried (e.g. seafood, sushi,
spirits, tobacco), REJECT with that entry as the reason. Do not surface such
items on the theory that a store like this "might stock" them; imitation or
adjacent forms of a not-carried category (imitation crab, sashimi, seasoned
octopus) count as that category."""

_bedrock = boto3.client("bedrock-runtime", region_name="us-west-2")


def embed(text: str):
    resp = _bedrock.invoke_model(
        modelId=EMBED_MODEL,
        body=json.dumps({"inputText": text[:8000], "dimensions": 1024}))
    return json.loads(resp["body"].read())["embedding"]


def make_agent() -> Agent:
    model = BedrockModel(model_id=TRIAGE_MODEL, region_name="us-west-2",
                         temperature=0.0, streaming=False)
    return Agent(model=model, system_prompt=TRIAGE_SYSTEM, callback_handler=None)


def triage_with_context(agent, item, profile, past):
    context = ""
    if past:
        lines = [
            f"- [{p['decision']}{' OVERTURNED by owner' if p['overturned'] else ''}] "
            f"{p['title'][:80]}: {p['reason']}" for p in past]
        context = ("\n\nSIMILAR PAST DECISIONS (follow their pattern unless this item "
                   "differs; an OVERTURNED rejection means the owner wanted to hear "
                   "about items like it):\n" + "\n".join(lines))
    # The carry list is recall-specific context; keep it out of non-recall
    # prompts so agenda/permit triage stays focused on the 8 core facts.
    profile_view = profile if "recall" in item.get("type", "") else \
        {k: v for k, v in profile.items() if k != "carry_list"}
    prompt = ("BUSINESS PROFILE:\n" + json.dumps(profile_view, indent=2) +
              context +
              "\n\nITEM TO TRIAGE:\n" + json.dumps(item, indent=2))
    # Each triage is independent: clear conversation state so the agent does not
    # drag prior items' prompts along (the default sliding window multiplied
    # input tokens ~25x across long batch loops).
    agent.messages = []
    text = str(agent(prompt)).strip()
    if text.startswith("```"):
        text = text.strip("`").removeprefix("json").strip()
    return json.loads(text)


def item_key(item):
    return (item.get("external_id") or item.get("recall_number")
            or item.get("link") or item.get("title", "")[:180])


def run(limit=None) -> dict:
    profile = json.loads(PROFILE_PATH.read_text())
    agent = make_agent()
    conn = db.connect()

    items = fda_recalls.fetch_items()
    for it in items:
        it["external_id"] = item_key(it)

    with conn.cursor() as c:
        c.execute("SELECT source, external_id FROM documents")
        seen = {(r[0], r[1]) for r in c.fetchall()}
    fresh = [it for it in items if (it["source"], it["external_id"]) not in seen]
    if limit:
        fresh = fresh[:limit]

    counts = {"ALERT": 0, "REJECT": 0, "OPPORTUNITY": 0}
    alerts = []
    for it in fresh:
        emb = embed(it.get("title", "") + " " + it.get("reason_for_recall", it.get("description", "")))
        past = db.similar_past_decisions(conn, emb, k=5)
        decision = triage_with_context(agent, it, profile, past)
        doc_id = db.upsert_document(conn, it)
        db.insert_decision(conn, doc_id, decision, emb)
        counts[decision["decision"]] = counts.get(decision["decision"], 0) + 1
        if decision["decision"] in ("ALERT", "OPPORTUNITY"):
            alerts.append({"title": it.get("title", "")[:150],
                           "decision": decision["decision"], "reason": decision["reason"]})
    conn.close()
    return {"fetched": len(items), "triaged": len(fresh), "counts": counts, "alerts": alerts}
