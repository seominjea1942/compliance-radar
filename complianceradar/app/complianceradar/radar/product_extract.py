"""Structured product extraction for recall items.

Extraction, not invention: the model may only COPY strings present in the
description; UPC candidates are validated by regex before being stored. The
result lives in the document payload as payload.product:
  {brand, product_name, sizes: [..], upcs: [..], containers: [..]}
Any field the text does not state is null/empty.
"""
import json
import re

from strands import Agent
from strands.models import BedrockModel

MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0"

EXTRACT_SYSTEM = """Extract structured product fields from FDA recall product
descriptions. STRICT RULES: copy strings that appear in the text; never guess,
complete, or normalize. If a field is not clearly present, use null (or []).
- brand: the brand name as printed
- product_name: the product minus brand/size boilerplate
- sizes: e.g. ["ONE PINT (473mL)", "8 oz"]
- upcs: every complete UPC/barcode number in the text, digits only
- containers: e.g. ["plastic bag", "carton"] if stated
Respond ONLY with JSON: {"<id>": {"brand":..., "product_name":..., "sizes":[...],
"upcs":[...], "containers":[...]}, ...} covering every id."""

_agent = None


def _get_agent() -> Agent:
    global _agent
    if _agent is None:
        model = BedrockModel(model_id=MODEL, region_name="us-west-2",
                             temperature=0.0, streaming=False)
        _agent = Agent(model=model, system_prompt=EXTRACT_SYSTEM, callback_handler=None)
    return _agent


def _valid_upcs(candidates, source_text: str):
    """Keep only 8/12/13/14-digit codes that literally appear in the text."""
    out = []
    digits_in_text = re.sub(r"[^0-9]", " ", source_text)
    for c in candidates or []:
        d = re.sub(r"[^0-9]", "", str(c))
        if len(d) in (8, 12, 13, 14) and d in digits_in_text.replace(" ", "") + " " + digits_in_text:
            if d in re.sub(r"[^0-9]", "", source_text) and d not in out:
                out.append(d)
    return out


def extract_products(items: list[dict]) -> dict:
    """items: [{"id": ..., "text": <full product description>}] -> {id: product}"""
    agent = _get_agent()
    results = {}
    for i in range(0, len(items), 15):
        batch = items[i:i+15]
        agent.messages = []
        resp = str(agent(json.dumps(batch))).strip()
        if resp.startswith("```"):
            resp = resp.strip("`").removeprefix("json").strip()
        m = re.search(r"\{.*\}", resp, re.S)
        parsed = json.loads(m.group(0)) if m else {}
        for it in batch:
            p = parsed.get(str(it["id"])) or {}
            results[it["id"]] = {
                "brand": (p.get("brand") or None),
                "product_name": (p.get("product_name") or None),
                "sizes": p.get("sizes") or [],
                "upcs": _valid_upcs(p.get("upcs"), it["text"]),
                "containers": p.get("containers") or [],
            }
    return results
