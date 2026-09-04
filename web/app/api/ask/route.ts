import { NextResponse } from "next/server";
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import { askPayload, isValidSessionId, DECISION_ID_RE, type AskResult } from "@/lib/ask";

/**
 * "Ask the radar" — the one route that leaves our infrastructure.
 *
 * Node runtime because the AWS SDK signs requests with primitives the Edge
 * runtime does not provide. Everything else in the app stays Edge-capable.
 */
export const runtime = "nodejs";

/**
 * Latency is 3-8s warm. A vague question used to tool-thrash for as long as
 * 121.9s; the backend has since capped that at a 3-tool-call budget, but the
 * abort stays because the ceiling is ours to respect either way. 60s is the
 * limit that holds on every Vercel plan, so the request is abandoned just
 * under it with a real message rather than a platform timeout page. The
 * contract endorses this behaviour.
 */
export const maxDuration = 60;
const ABORT_AFTER_MS = 55_000;

let client: BedrockAgentCoreClient | undefined;

function runtimeClient(): BedrockAgentCoreClient {
  // Cached across invocations on a warm lambda; construction opens no socket.
  if (!client) client = new BedrockAgentCoreClient({ region: process.env.AWS_REGION });
  return client;
}

function fail(error: string, status: number) {
  return NextResponse.json<AskResult>({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const arn = process.env.AGENT_RUNTIME_ARN;
  if (!arn || !process.env.AWS_ACCESS_KEY_ID) {
    // Deployed without the runtime key. Say so plainly: a silent empty answer
    // would read as the agent having nothing to say.
    return fail("Ask isn't configured on this deployment yet.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Malformed request.", 400);
  }

  const { question, sessionId, decisionId } = (body ?? {}) as Record<string, unknown>;

  if (typeof question !== "string" || !question.trim()) {
    return fail("Ask a question first.", 400);
  }
  if (question.length > 2000) {
    return fail("That question is too long. Try a shorter one.", 400);
  }
  if (!isValidSessionId(sessionId)) {
    return fail("Invalid session.", 400);
  }
  if (decisionId != null && (typeof decisionId !== "string" || !DECISION_ID_RE.test(decisionId))) {
    return fail("Invalid item reference.", 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ABORT_AFTER_MS);

  try {
    const result = await runtimeClient().send(
      new InvokeAgentRuntimeCommand({
        agentRuntimeArn: arn,
        // The runtime keys its conversation history off this, so follow-ups
        // only thread when the browser sends the same value each time.
        runtimeSessionId: sessionId,
        contentType: "application/json",
        accept: "application/json",
        payload: new TextEncoder().encode(
          askPayload(question.trim(), sessionId, typeof decisionId === "string" ? decisionId : null),
        ),
      }),
      { abortSignal: controller.signal },
    );

    // The runtime answers with one JSON object, not an event stream.
    const raw = await result.response?.transformToString();
    if (!raw) return fail("The radar returned nothing. Try asking again.", 502);

    const parsed = JSON.parse(raw) as { status?: string; answer?: string; error?: string };

    if (parsed.status !== "ok" || typeof parsed.answer !== "string") {
      console.error("ask: unexpected runtime response", raw.slice(0, 500));
      return fail(parsed.error ?? "The radar couldn't answer that one.", 502);
    }

    return NextResponse.json<AskResult>({ ok: true, answer: parsed.answer });
  } catch (e) {
    if (controller.signal.aborted) {
      return fail("That took longer than I can wait. Try a narrower question.", 504);
    }
    console.error("ask: runtime invoke failed", e);
    return fail("I couldn't reach the radar just now. Try again in a moment.", 502);
  } finally {
    clearTimeout(timer);
  }
}
