"""AgentCore Runtime entrypoint for the Compliance Radar daily loop.

Invoked by: EventBridge Scheduler -> Lambda -> InvokeAgentRuntime.
Payload: {"action": "daily_run", "limit": <optional int>}
         {"action": "ping"} for health checks.
"""
import json
import os
import pathlib
import sys

from bedrock_agentcore.runtime import BedrockAgentCoreApp

ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

app = BedrockAgentCoreApp()


@app.entrypoint
def handler(payload, context=None):
    action = (payload or {}).get("action", "daily_run")
    if action == "ping":
        return {"status": "ok"}

    from pipeline.run_daily import run  # import here so ping stays fast
    limit = (payload or {}).get("limit")
    summary = run(limit=limit)
    return {"status": "ok", "summary": summary}


if __name__ == "__main__":
    app.run()
