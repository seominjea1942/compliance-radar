/**
 * Shared contract for the forwardable brief.
 *
 * The brief itself is written by the deployed AgentCore runtime (a Haiku call
 * behind `{"action": "brief"}`), not here. This module is only the wire format
 * the panel and the route agree on, kept beside `lib/ask.ts` for the same
 * reason: both sides of the request have to be edited together.
 */

/** The id shape the runtime's decision lookup accepts. Same rule as ask. */
export const DECISION_ID_RE = /^\d{1,20}$/;

export type BriefResult =
  | { ok: true; brief: string }
  | { ok: false; error: string };

/**
 * Build the runtime payload.
 *
 * `decision_id` stays a string end to end. Decision ids exceed
 * `Number.MAX_SAFE_INTEGER`, so routing one through a JS number silently
 * rounds it and the runtime then truthfully reports no such decision. The
 * runtime's `_as_id` parses the string back to an int on its side.
 */
export function briefPayload(decisionId: string): string {
  if (!DECISION_ID_RE.test(decisionId)) throw new Error(`Malformed decision id: ${decisionId}`);
  return JSON.stringify({ action: "brief", decision_id: decisionId });
}
