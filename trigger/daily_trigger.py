"""Daily trigger Lambda: EventBridge Scheduler -> this -> InvokeAgentRuntime.

Invokes the Compliance Radar agent's daily run, then emails any ALERT or
OPPORTUNITY items to the owner via SES. Silence is the product: no alerts,
no email.
"""
import json
import os
import uuid

import boto3
from botocore.config import Config

RUNTIME_ARN = os.environ["AGENT_RUNTIME_ARN"]
ALERT_FROM = os.environ.get("ALERT_FROM", "radar@recalls.minjeaseo.com")
ALERT_TO = os.environ.get("ALERT_TO", "seominjea1942@gmail.com")

# One attempt, long read timeout: a daily run longer than boto3's default
# 60s read timeout must NOT be client-retried (a retry re-runs the whole
# triage pass; same failure class as the Sept 8 scheduler-retry incident).
agentcore = boto3.client(
    "bedrock-agentcore",
    config=Config(read_timeout=900, retries={"total_max_attempts": 1}),
)
ses = boto3.client("ses")


def handler(event, context):
    resp = agentcore.invoke_agent_runtime(
        agentRuntimeArn=RUNTIME_ARN,
        runtimeSessionId=f"daily-{uuid.uuid4()}",
        payload=json.dumps({"action": "daily_run"}).encode(),
    )
    body = resp["response"].read() if hasattr(resp.get("response"), "read") else resp.get("response")
    result = json.loads(body)
    summary = result.get("summary", {})
    alerts = summary.get("alerts", [])
    print(f"summary: {json.dumps(summary)[:500]}")

    if alerts:
        lines = [f"[{a['decision']}] {a['title']}\n    Why: {a['reason']}" for a in alerts]
        text = (
            "Compliance Radar found items that may affect Willow Glen Family Market:\n\n"
            + "\n\n".join(lines)
            + "\n\n---\nThis is an automated flag for human review, not legal or compliance advice."
            + f"\nTriaged {summary.get('triaged', 0)} new items today; "
            + f"{summary.get('counts', {}).get('REJECT', 0)} were filtered out (see the rejection log)."
        )
        ses.send_email(
            Source=ALERT_FROM,
            Destination={"ToAddresses": [ALERT_TO]},
            Message={
                "Subject": {"Data": f"Compliance Radar: {len(alerts)} item(s) need your eyes"},
                "Body": {"Text": {"Data": text}},
            },
        )
        print(f"alert email sent to {ALERT_TO}")
    return {"status": "ok", "summary": summary, "emailed": bool(alerts)}
