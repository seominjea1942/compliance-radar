import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import { briefPayload, DECISION_ID_RE, type BriefResult } from "@/lib/brief";

/**
 * "Share via email": ask the runtime for a forwardable brief about one item.
 *
 * Node runtime for the same reason as `/api/ask`: the AWS SDK signs requests
 * with primitives the Edge runtime does not provide.
 */
export const runtime = "nodejs";

/**
 * Measured at 10.2s against the deployed runtime on a cold-ish container, and
 * it is one Haiku call with no tool loop, so it has no path to the ask route's
 * worst case. 30s is a generous ceiling that still fails before the platform
 * does, leaving room to show a real message instead of a timeout page.
 */
export const maxDuration = 60;
const ABORT_AFTER_MS = 30_000;

let client: BedrockAgentCoreClient | undefined;

function runtimeClient(): BedrockAgentCoreClient {
  if (!client) client = new BedrockAgentCoreClient({ region: process.env.AWS_REGION });
  return client;
}

function fail(error: string, status: number) {
  return NextResponse.json<BriefResult>({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const arn = process.env.AGENT_RUNTIME_ARN;
  if (!arn || !process.env.AWS_ACCESS_KEY_ID) {
    return fail("Briefs aren't configured on this deployment yet.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Malformed request.", 400);
  }

  const { decisionId } = (body ?? {}) as Record<string, unknown>;
  if (typeof decisionId !== "string" || !DECISION_ID_RE.test(decisionId)) {
    return fail("Invalid item reference.", 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ABORT_AFTER_MS);

  try {
    const result = await runtimeClient().send(
      new InvokeAgentRuntimeCommand({
        agentRuntimeArn: arn,
        /*
         * A brief carries no conversation, and AgentCore keys server-side
         * history off this value, so each request gets its own id. Threading
         * briefs onto the chat's session id would leave them in the history
         * the next "Ask" answers from.
         */
        runtimeSessionId: `brief-${randomUUID().replace(/-/g, "")}`,
        contentType: "application/json",
        accept: "application/json",
        payload: new TextEncoder().encode(briefPayload(decisionId)),
      }),
      { abortSignal: controller.signal },
    );

    const raw = await result.response?.transformToString();
    if (!raw) return fail("The radar returned nothing. Try again.", 502);

    const parsed = JSON.parse(raw) as { status?: string; brief?: string; message?: string };

    if (parsed.status !== "ok" || typeof parsed.brief !== "string") {
      console.error("brief: unexpected runtime response", raw.slice(0, 500));
      return fail(parsed.message ?? "I couldn't write a brief for that one.", 502);
    }

    return NextResponse.json<BriefResult>({ ok: true, brief: parsed.brief });
  } catch (e) {
    if (controller.signal.aborted) {
      return fail("That took longer than I can wait. Try again in a moment.", 504);
    }
    console.error("brief: runtime invoke failed", e);
    return fail("I couldn't reach the radar just now. Try again in a moment.", 502);
  } finally {
    clearTimeout(timer);
  }
}
