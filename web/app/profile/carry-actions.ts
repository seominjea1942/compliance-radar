"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";

/**
 * Carry-list writes. Unfrozen by owner sign-off on 2026-09-05.
 *
 * The runtime reads this profile from the DB live, so these edits change how
 * FUTURE items are triaged. Past decisions are never rewritten.
 */
export type CarryInput = { category: string; carries: boolean; brands: string[] };

type Result = { ok: true } | { ok: false; error: string };

function clean(input: CarryInput): CarryInput | null {
  const category = input.category?.trim();
  if (!category || category.length > 200) return null;
  const brands = (input.brands ?? [])
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 40);
  return { category, carries: !!input.carries, brands };
}

export async function addCarryEntry(input: CarryInput): Promise<Result> {
  const entry = clean(input);
  if (!entry) return { ok: false, error: "Name the item first." };

  try {
    // Atomic append, per the contract: no read-modify-write for the add path.
    await query(
      `UPDATE store_profile
          SET profile = JSON_ARRAY_APPEND(profile, '$.carry_list.entries', CAST(? AS JSON))
        WHERE id = 1`,
      [JSON.stringify(entry)],
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Write failed." };
  }

  revalidatePath("/profile");
  return { ok: true };
}

/** Read-modify-write for edit and remove; single-owner app, no locking needed. */
async function rewriteEntries(
  mutate: (entries: CarryInput[]) => CarryInput[],
): Promise<Result> {
  const [row] = await query<{ profile: unknown }>(
    `SELECT profile FROM store_profile WHERE id = 1`,
  );
  if (!row) return { ok: false, error: "No store profile row." };

  const profile =
    typeof row.profile === "string"
      ? JSON.parse(row.profile)
      : (row.profile as Record<string, unknown>);

  const carryList = (profile.carry_list ?? {}) as Record<string, unknown>;
  const entries: CarryInput[] = Array.isArray(carryList.entries) ? carryList.entries : [];

  carryList.entries = mutate(entries);
  profile.carry_list = carryList;

  try {
    await query(`UPDATE store_profile SET profile = ? WHERE id = 1`, [JSON.stringify(profile)]);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Write failed." };
  }

  revalidatePath("/profile");
  return { ok: true };
}

export async function editCarryEntry(
  originalCategory: string,
  input: CarryInput,
): Promise<Result> {
  const entry = clean(input);
  if (!entry) return { ok: false, error: "Name the item first." };

  return rewriteEntries((entries) =>
    entries.map((e) => (e.category === originalCategory ? { ...e, ...entry } : e)),
  );
}

export async function removeCarryEntry(category: string): Promise<Result> {
  if (!category?.trim()) return { ok: false, error: "Nothing to remove." };
  return rewriteEntries((entries) => entries.filter((e) => e.category !== category));
}
