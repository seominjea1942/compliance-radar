"""Compliance Radar AgentCore Runtime entrypoint.

One runtime, two modes:
  Batch (EventBridge Scheduler -> Lambda -> InvokeAgentRuntime):
    {"action": "ping"}                      health check
    {"action": "daily_run", "limit": N}     full triage pass (limit optional)
  Interactive (web app -> InvokeAgentRuntime with a per-user runtimeSessionId):
    {"action": "ask", "question": "...", "decision_id": <optional int>,
     "session_id": "<chat session key>"}    tool-using Q&A over watched data
    {"action": "brief", "decision_id": N}   forwardable email brief for an item
"""
import json
import pathlib
import sys

from bedrock_agentcore.runtime import BedrockAgentCoreApp

sys.path.insert(0, str(pathlib.Path(__file__).parent))

app = BedrockAgentCoreApp()
log = app.logger


@app.entrypoint
def handler(payload, context=None):
    action = (payload or {}).get("action", "daily_run")
    log.info("compliance-radar invoked, action=%s", action)
    if action == "ping":
        return {"status": "ok"}

    def _as_id(v):
        # decision_ids exceed JS safe integers; accept them as strings
        try:
            return int(str(v)) if v is not None else None
        except (TypeError, ValueError):
            return None

    if action == "ask":
        from radar.ask import ask
        session_id = str((payload or {}).get("session_id") or
                         getattr(context, "session_id", None) or "default")
        answer = ask(question=str(payload.get("question", ""))[:2000],
                     session_id=session_id,
                     decision_id=_as_id(payload.get("decision_id")))
        return {"status": "ok", "answer": answer}

    if action == "brief":
        from radar import db
        from radar.brief import make_brief
        conn = db.connect()
        with conn.cursor() as c:
            c.execute("""SELECT doc.payload, d.reason FROM triage_decisions d
                         JOIN documents doc ON doc.id = d.document_id
                         WHERE d.id = %s""", (_as_id(payload.get("decision_id")),))
            row = c.fetchone()
        conn.close()
        if not row:
            return {"status": "error", "message": "unknown decision_id"}
        return {"status": "ok",
                "brief": make_brief(json.loads(row[0]), row[1], "Willow Glen Family Market")}

    from radar.pipeline import run  # deferred so ping stays fast
    summary = run(limit=(payload or {}).get("limit"))
    log.info("daily run summary: %s", summary)
    return {"status": "ok", "summary": summary}


if __name__ == "__main__":
    app.run()
