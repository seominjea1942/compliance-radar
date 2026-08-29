"""Two-stage council-item triage.

Stage 1 (title triage): cheap pass over EventItem titles. Most items REJECT
here. Items whose title is opaque but whose category could hide store impact
(fee programs, infrastructure work plans, rate schedules) return INVESTIGATE.

Stage 2 (deep read): fetch the staff report PDF for INVESTIGATE items, extract
text, and triage with full content. Output includes key_dates and an evidence
excerpt (attachment name, page, quote) for the UI's "where we found it"
component. Evidence is stored on the document payload.
"""
import io
import json
import time
import urllib.request

from strands import Agent
from strands.models import BedrockModel

BASE = "https://webapi.legistar.com/v1/sanjose"
UA = {"User-Agent": "compliance-radar/0.1 (hackathon; contact: seominjea1942@gmail.com)"}
MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0"

STAGE1_SYSTEM = """You are stage 1 of a two-stage compliance triage for one
specific small business. You see ONLY a council agenda item's title and
metadata. Decide:
- "REJECT": clearly irrelevant to this business (ceremonial, internal city
  procedure, other neighborhoods' land use, city's own staffing).
- "INVESTIGATE": the item COULD affect this business but the title alone
  cannot settle it. Fee schedules, rate hearings, program changes,
  infrastructure or utility work plans, and anything on a consent calendar
  whose title is generic deserve INVESTIGATE; consent titles routinely hide
  neighborhood-level details.
Respond ONLY with JSON: {"decision": "REJECT"|"INVESTIGATE", "reason": "<one
sentence citing a profile fact for rejects>",
"tags": ["<from: city-programs-fees, council-routine, nearby-construction, labor-workforce>"]}"""

STAGE2_SYSTEM = """You are stage 2 of compliance triage: you have the item's
staff report text and the business profile. Decide ALERT / REJECT /
OPPORTUNITY for THIS business. Default to REJECT; silence is the product.
Never give legal advice; flag for human review.
Respond ONLY with JSON:
{
  "decision": "ALERT" | "REJECT" | "OPPORTUNITY",
  "reason": "<one sentence citing the specific profile fact>",
  "profile_fact_id": "<fact id or null>",
  "tags": ["<1-2 from: city-programs-fees, council-routine, nearby-construction, labor-workforce>"],
  "key_dates": [{"label": "<what the date is>", "date": "<YYYY-MM-DD or YYYY-MM>"}],
  "evidence": {"quote": "<the exact sentence(s) from the report that drove the decision, max 60 words>", "page_hint": <integer page number where found, or null>}
}"""


def _get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _make_agent(system: str) -> Agent:
    model = BedrockModel(model_id=MODEL, region_name="us-west-2",
                         temperature=0.0, streaming=False)
    return Agent(model=model, system_prompt=system, callback_handler=None)


def _parse(resp) -> dict:
    text = str(resp).strip()
    if text.startswith("```"):
        text = text.strip("`").removeprefix("json").strip()
    return json.loads(text)


def fetch_staff_report(matter_id: int) -> tuple[str, str]:
    """Returns (attachment_name, extracted_text) for the best attachment."""
    import pdfplumber
    atts = json.loads(_get(f"{BASE}/Matters/{matter_id}/Attachments"))
    pdfs = [a for a in atts
            if "legistar.granicus.com" in (a.get("MatterAttachmentHyperlink") or "")]
    if not pdfs:
        return "", ""
    pick = next((a for a in pdfs if "memorandum" in (a.get("MatterAttachmentName") or "").lower()),
                pdfs[0])
    time.sleep(1.0)
    data = _get(pick["MatterAttachmentHyperlink"], timeout=120)
    pages = []
    with pdfplumber.open(io.BytesIO(data)) as d:
        for n, pg in enumerate(d.pages[:40], 1):
            pages.append(f"[page {n}]\n" + (pg.extract_text() or ""))
    return pick.get("MatterAttachmentName", ""), "\n".join(pages)


def triage_council_item(item: dict, profile: dict) -> tuple[dict, dict]:
    """Returns (decision_dict, payload_extras). Two-stage; stage 2 only for
    INVESTIGATE survivors."""
    facts = {"facts": profile["facts"], "location": profile.get("location")}
    s1 = _parse(_make_agent(STAGE1_SYSTEM)(
        "BUSINESS PROFILE:\n" + json.dumps(facts) +
        "\n\nAGENDA ITEM:\n" + json.dumps(item)))
    if s1["decision"] == "REJECT":
        return ({"decision": "REJECT", "reason": s1["reason"],
                 "profile_fact_id": None, "tags": s1.get("tags") or ["council-routine"]},
                {"triage_stage": "title"})

    name, text = fetch_staff_report(item["matter_id"])
    if not text.strip():
        return ({"decision": "REJECT",
                 "reason": "Title suggested possible relevance but no readable staff report "
                           "was available to confirm; filtered pending better data.",
                 "profile_fact_id": None, "tags": s1.get("tags") or ["council-routine"]},
                {"triage_stage": "deep_read_failed"})

    s2 = _parse(_make_agent(STAGE2_SYSTEM)(
        "BUSINESS PROFILE:\n" + json.dumps(facts) +
        "\n\nAGENDA ITEM:\n" + json.dumps(item) +
        f"\n\nSTAFF REPORT ({name}, page markers included):\n" + text[:60000]))
    extras = {"triage_stage": "deep_read", "staff_report_attachment": name,
              "key_dates": s2.get("key_dates") or [],
              "evidence": s2.get("evidence") or {}}
    return ({"decision": s2["decision"], "reason": s2["reason"],
             "profile_fact_id": s2.get("profile_fact_id"),
             "tags": s2.get("tags") or []},
            extras)
