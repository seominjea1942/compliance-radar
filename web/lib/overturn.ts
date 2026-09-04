/**
 * Overturn reasons, matching the contract's `overturn_reason_type` enum.
 *
 * These live outside app/log/actions.ts on purpose: a "use server" module may
 * only export async functions, so a constant exported from there is rewritten
 * into a server reference and is not an array by the time the client sees it.
 */
export const OVERTURN_REASONS = [
  { value: "affects_us", label: "This actually affects us" },
  { value: "always_show", label: "Always show me this topic" },
  { value: "curious", label: "Just curious" },
  { value: "other", label: "Something else…" },
] as const;

export type OverturnReason = (typeof OVERTURN_REASONS)[number]["value"];

export const OVERTURN_REASON_VALUES: ReadonlySet<string> = new Set(
  OVERTURN_REASONS.map((r) => r.value),
);
