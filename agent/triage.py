"""Walking-skeleton triage agent: one item in, one structured decision out.

Strands agent on Bedrock. The agent knows nothing about groceries; everything
store-specific comes from the profile JSON passed in the prompt.
"""
import json
import pathlib

from strands import Agent
from strands.models import BedrockModel

PROFILE_PATH = pathlib.Path(__file__).parent.parent / "profile" / "store_profile.json"

TRIAGE_SYSTEM = """You are a compliance triage engine for one specific small business.
You receive one item (a recall, agenda item, permit, or rule) and the business profile.
Decide whether this item genuinely affects THIS business.

Respond with ONLY a JSON object, no other text:
{
  "decision": "ALERT" | "REJECT" | "OPPORTUNITY",
  "reason": "<one sentence, citing the specific profile fact that drove the decision>",
  "profile_fact_id": "<id of the profile fact that drove the decision, or null>"
}

Default to REJECT. Silence is the product: only ALERT when the item plausibly
requires the owner to look at it. An overly chatty radar is a broken radar.
Never give legal advice; you flag items for a human to review."""


def load_profile() -> dict:
    return json.loads(PROFILE_PATH.read_text())


def make_agent() -> Agent:
    model = BedrockModel(
        model_id="us.anthropic.claude-haiku-4-5-20251001-v1:0",
        region_name="us-west-2",
        temperature=0.0,
        streaming=False,
    )
    return Agent(model=model, system_prompt=TRIAGE_SYSTEM, callback_handler=None)


def triage_item(agent: Agent, item: dict, profile: dict) -> dict:
    prompt = (
        "BUSINESS PROFILE:\n" + json.dumps(profile, indent=2) +
        "\n\nITEM TO TRIAGE:\n" + json.dumps(item, indent=2)
    )
    result = agent(prompt)
    text = str(result).strip()
    if text.startswith("```"):
        text = text.strip("`").removeprefix("json").strip()
    return json.loads(text)


if __name__ == "__main__":
    profile = load_profile()
    agent = make_agent()
    # Three smoke-test items chosen to exercise ALERT, REJECT, and OPPORTUNITY.
    items = [
        {"source": "openFDA enforcement", "type": "food_recall",
         "product_description": "Ready-to-eat chicken salad sandwiches, 8 oz",
         "reason_for_recall": "Potential Listeria monocytogenes contamination",
         "distribution_pattern": "CA, NV, OR", "classification": "Class I"},
        {"source": "SJ Legistar", "type": "council_agenda_item",
         "title": "Ordinance amending Title 6 regarding tobacco retail license fees and enforcement",
         "matter_type": "Consent Agenda"},
        {"source": "SJ Legistar", "type": "council_agenda_item",
         "title": "Pilot program to streamline sidewalk vending and merchandise display permits for small businesses",
         "matter_type": "Consent Agenda"},
    ]
    for item in items:
        d = triage_item(agent, item, profile)
        print(f"{d['decision']:12} | {d.get('profile_fact_id')} | {d['reason']}")
