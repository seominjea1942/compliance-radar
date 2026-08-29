"""Compliance Radar AgentCore Runtime entrypoint.

Invoked by: EventBridge Scheduler -> Lambda -> InvokeAgentRuntime.
Payloads:
  {"action": "ping"}                      health check
  {"action": "daily_run", "limit": N}     full triage pass (limit optional)
"""
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

    from radar.pipeline import run  # deferred so ping stays fast
    summary = run(limit=(payload or {}).get("limit"))
    log.info("daily run summary: %s", summary)
    return {"status": "ok", "summary": summary}


if __name__ == "__main__":
    app.run()
