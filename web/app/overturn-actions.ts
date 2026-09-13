"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { OVERTURN_REASON_VALUES, type OverturnReason } from "@/lib/overturn";

/**
 * Overturn one filtered decision.
 *
 * This is one of exactly two writes the contract permits from the UI (the
 * other being profile facts). It never re-triages or edits the original
 * decision: it sets the overturn columns and nothing else.
 *
 * `reasonType` is optional because the design lets the owner skip it, in which
 * case only this one item changes and no learning signal is recorded.
 */
export async function overturnDecision(
  decisionId: string,
  reasonType?: OverturnReason,
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // BIGINT ids arrive as strings (contract rule 2); keep them that way and let
  // the driver bind, but refuse anything that is not a plain integer.
  if (!/^\d{1,20}$/.test(decisionId)) {
    return { ok: false, error: "Invalid decision id." };
  }
  if (reasonType && !OVERTURN_REASON_VALUES.has(reasonType)) {
    return { ok: false, error: "Unknown reason." };
  }

  try {
    await query(
      `UPDATE triage_decisions
          SET overturned = TRUE,
              overturned_at = NOW(),
              overturn_reason_type = ?,
              overturn_note = ?
        WHERE id = ?`,
      [reasonType ?? null, note?.trim() || null, decisionId],
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Write failed." };
  }

  revalidatePath("/");
  return { ok: true };
}
