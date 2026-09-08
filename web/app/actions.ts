"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { RESOLUTION_VALUES, type Resolution } from "@/lib/resolution";

/**
 * Record the outcome of a Resolve pass.
 *
 * One write per row the owner acted on. "Keep open" rows are simply absent
 * from `decisions`, so they get no write and stay in the feed. Resolution is
 * independent of the overturn flow: overturns belong to REJECT rows.
 */
export async function resolveItems(
  decisions: { decisionId: string; resolution: Resolution }[],
): Promise<{ ok: true; written: number } | { ok: false; error: string }> {
  const clean = decisions.filter(
    (d) => /^\d{1,20}$/.test(d.decisionId) && RESOLUTION_VALUES.has(d.resolution),
  );

  if (clean.length !== decisions.length) {
    return { ok: false, error: "Invalid selection." };
  }
  if (clean.length === 0) {
    return { ok: true, written: 0 };
  }

  try {
    for (const d of clean) {
      await query(
        `UPDATE triage_decisions SET resolution = ?, resolved_at = NOW() WHERE id = ?`,
        [d.resolution, d.decisionId],
      );
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Write failed." };
  }

  revalidatePath("/");
  return { ok: true, written: clean.length };
}
