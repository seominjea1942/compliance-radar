"""Ask the radar: interactive Q&A agent with database tools.

A Strands agent that answers Sam's questions from the same data the radar
watches, using tools to query TiDB (views + vector search) and never inventing
facts. Sessions keep their own bounded conversation history (LRU cache keyed
by AgentCore session id), so follow-ups work without unbounded token growth.
"""
import json
from collections import OrderedDict

from strands import Agent, tool
from strands.agent.conversation_manager import SlidingWindowConversationManager
from strands.models import BedrockModel

from radar import db
from radar.pipeline import embed, PROFILE_PATH

MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
MAX_SESSIONS = 64
WINDOW_MESSAGES = 12  # bounded history: ~6 exchanges per session

ASK_SYSTEM = """You are the Compliance Radar assistant for Willow Glen Family
Market. Answer the owner's questions using ONLY the tools and the item context
provided. You watch: FDA/FSIS food recalls, San Jose city council agendas, and
building permits near the store.

Rules:
- Ground every claim in tool results or provided context; if the data does not
  answer the question, say so plainly.
- Keep answers short: 2-4 sentences, owner-friendly, no jargon.
- Never give legal or compliance advice; you explain what the radar saw and
  why it decided what it did. Recommend a human professional for legal calls.
- When asked "why did this reach me" or "why was this filtered", quote the
  recorded reason and the profile fact behind it.
- STATUS QUESTIONS ARE ALWAYS LIVE: for anything about current state (what is
  open, what was handled/resolved, counts), call the relevant tool IN THIS
  TURN, even if an earlier turn already listed items; the owner changes state
  between messages. Prefix such answers with "as of now".
- If no tool can answer the question, say you cannot see that data. Never
  infer status from memory or from other items."""


@tool
def get_decision(decision_id: int) -> str:
    """Fetch one triage decision with its document details by decision_id."""
    conn = db.connect()
    with conn.cursor() as c:
        c.execute(
            """SELECT d.decision, d.action_type, d.reason, d.tags, d.profile_fact_id,
                      d.resolution, d.created_at, doc.title, doc.source, doc.payload
               FROM triage_decisions d JOIN documents doc ON doc.id = d.document_id
               WHERE d.id = %s""", (decision_id,))
        row = c.fetchone()
    conn.close()
    if not row:
        return "No decision with that id."
    keys = ["decision", "action_type", "reason", "tags", "profile_fact_id",
            "resolution", "created_at", "title", "source", "payload"]
    out = dict(zip(keys, [str(v)[:1200] for v in row]))
    return json.dumps(out)


@tool
def todays_filtered_items(limit: int = 15) -> str:
    """List the most recently filtered (rejected) items with their reasons."""
    conn = db.connect()
    with conn.cursor() as c:
        c.execute(
            """SELECT LEFT(title, 90), source, COALESCE(short_reason, LEFT(reason, 90)), created_at
               FROM v_filtered_log LIMIT %s""", (min(limit, 25),))
        rows = c.fetchall()
    conn.close()
    return json.dumps([{"title": r[0], "source": r[1], "why_filtered": r[2],
                        "at": str(r[3])} for r in rows])


@tool
def open_action_items() -> str:
    """List currently surfaced, unresolved items (what needs the owner's attention)."""
    conn = db.connect()
    with conn.cursor() as c:
        c.execute(
            """SELECT decision_id, LEFT(title, 90), action_type,
                      COALESCE(short_reason, LEFT(reason, 90)), event_key
               FROM v_surfaced_feed WHERE resolution IS NULL LIMIT 25""")
        rows = c.fetchall()
    conn.close()
    return json.dumps([{"decision_id": r[0], "title": r[1], "action_type": r[2],
                        "why": r[3], "event_key": r[4]} for r in rows])


@tool
def recently_resolved_items(limit: int = 10) -> str:
    """List items the owner recently resolved (handled or marked not-carried),
    newest first. Use this for 'what did I handle/resolve' questions."""
    conn = db.connect()
    with conn.cursor() as c:
        c.execute(
            """SELECT LEFT(title, 90), resolution, resolved_at,
                      COALESCE(short_reason, LEFT(reason, 80))
               FROM v_surfaced_feed WHERE resolution IS NOT NULL
               ORDER BY resolved_at DESC LIMIT %s""", (min(limit, 25),))
        rows = c.fetchall()
    conn.close()
    return json.dumps([{"title": r[0], "resolution": r[1], "resolved_at": str(r[2]),
                        "why_it_was_flagged": r[3]} for r in rows])


@tool
def search_watched_items(query: str) -> str:
    """Semantic search across everything the radar has reviewed (all decisions)."""
    conn = db.connect()
    results = db.similar_past_decisions(conn, embed(query), k=8)
    conn.close()
    return json.dumps([{"title": r["title"][:90], "decision": r["decision"],
                        "reason": r["reason"][:120]} for r in results])


def _profile_context() -> str:
    profile = json.loads(PROFILE_PATH.read_text())
    return json.dumps({"facts": profile["facts"],
                       "location": profile.get("location"),
                       "carries_summary": [
                           e["category"] for e in profile["carry_list"]["entries"] if e["carries"]],
                       "does_not_carry": [
                           e["category"] for e in profile["carry_list"]["entries"] if not e["carries"]]})


_sessions: OrderedDict = OrderedDict()


def _agent_for(session_id: str) -> Agent:
    if session_id in _sessions:
        _sessions.move_to_end(session_id)
        return _sessions[session_id]
    if len(_sessions) >= MAX_SESSIONS:
        _sessions.popitem(last=False)
    model = BedrockModel(model_id=MODEL, region_name="us-west-2",
                         temperature=0.0, streaming=False)
    agent = Agent(model=model, system_prompt=ASK_SYSTEM,
                  tools=[get_decision, todays_filtered_items,
                         open_action_items, recently_resolved_items,
                         search_watched_items],
                  conversation_manager=SlidingWindowConversationManager(
                      window_size=WINDOW_MESSAGES),
                  callback_handler=None)
    _sessions[session_id] = agent
    return agent


def ask(question: str, session_id: str, decision_id: int | None = None) -> str:
    """Answer one question; item-scoped when decision_id is given."""
    agent = _agent_for(session_id)
    parts = ["STORE PROFILE:\n" + _profile_context()]
    if decision_id:
        parts.append(f"THE OWNER IS ASKING ABOUT decision_id={decision_id} "
                     f"(use get_decision to read it before answering).")
    parts.append("QUESTION: " + question[:2000])
    return str(agent("\n\n".join(parts))).strip()
