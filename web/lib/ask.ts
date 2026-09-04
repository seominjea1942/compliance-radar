/**
 * Shared types and encoding rules for "Ask the radar".
 *
 * The answering agent runs on the deployed AgentCore runtime, not here; this
 * module is only the wire format both sides of the request agree on.
 */

/** What the panel sends to `/api/ask`. */
export type AskRequestBody = {
  question: string;
  /** Stable for the life of one browser chat session; see `newSessionId`. */
  sessionId: string;
  /** Decimal digits of a BIGINT decision id, or null for an unscoped ask. */
  decisionId?: string | null;
};

export type AskResult =
  | { ok: true; answer: string }
  | { ok: false; error: string };

/**
 * AWS rejects a `runtimeSessionId` shorter than 33 characters, and the runtime
 * keys its server-side history off the same value, so it must also be stable
 * across follow-ups. A prefixed uuid4 hex is 38 characters.
 */
export function newSessionId(): string {
  return `radar-${crypto.randomUUID().replace(/-/g, "")}`;
}

/** The id shape the runtime's decision lookup accepts. */
export const DECISION_ID_RE = /^\d{1,20}$/;

export function isValidSessionId(v: unknown): v is string {
  return typeof v === "string" && v.length >= 33 && v.length <= 128 && /^[A-Za-z0-9_-]+$/.test(v);
}

/**
 * Build the runtime payload with `decision_id` as an exact JSON number.
 *
 * Decision ids exceed `Number.MAX_SAFE_INTEGER`: routing one through a JS
 * number silently rounds it (7493989779944595520 is fine, but
 * 2017612633062072259 becomes ...2300) and the runtime then reports that no
 * such decision exists. The digits are spliced in as a literal so they survive
 * intact, which is the JS half of the contract's "BIGINT ids as strings" rule.
 */
export function askPayload(question: string, sessionId: string, decisionId?: string | null): string {
  const base: Record<string, unknown> = { action: "ask", question, session_id: sessionId };

  if (!decisionId) return JSON.stringify(base);
  if (!DECISION_ID_RE.test(decisionId)) throw new Error(`Malformed decision id: ${decisionId}`);

  const PLACEHOLDER = "__DECISION_ID__";
  return JSON.stringify({ ...base, decision_id: PLACEHOLDER }).replace(
    `"${PLACEHOLDER}"`,
    decisionId,
  );
}
