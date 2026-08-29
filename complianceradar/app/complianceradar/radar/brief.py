"""Forwardable brief: a self-contained plain-text email body for one surfaced
item. The recipient (accountant, lawyer, landlord) has zero context, so the
brief must carry: what happened, why it maps to this store, any deadline, and
the public source link. No login-required links as primary content.
"""
import json

from strands import Agent
from strands.models import BedrockModel

BRIEF_MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0"

BRIEF_SYSTEM = """You write short forwardable email briefs for a small grocery
store owner to send to their accountant, lawyer, or supplier. The recipient has
ZERO context. Plain text only (no markdown, no asterisks, no bold), under 200
words, exactly these four sections and nothing more:

WHAT HAPPENED: <2-3 sentences, plain language, no jargon>
WHY IT MAY AFFECT THE STORE: <1-2 sentences tied to the store specifics given>
DEADLINE OR TIMING: <date if any, otherwise "No deadline; informational.">
SOURCE: <the public link provided, or the official source name if no link>

Never present this as legal or compliance advice; it flags an item for human
review. Do not invent facts, deadlines, or links not present in the input."""


def make_brief(document_payload: dict, decision_reason: str, store_name: str) -> str:
    model = BedrockModel(model_id=BRIEF_MODEL, region_name="us-west-2",
                         temperature=0.0, streaming=False)
    agent = Agent(model=model, system_prompt=BRIEF_SYSTEM, callback_handler=None)
    prompt = (f"STORE: {store_name}\n"
              f"WHY THE RADAR SURFACED IT: {decision_reason}\n"
              f"ITEM:\n{json.dumps(document_payload, indent=2)}")
    return str(agent(prompt)).strip()
