"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";

type Fact = { id: string; fact: string; implies?: string | null };

/**
 * Facts are the only part of the profile the UI may write.
 *
 * The contract permits exactly two writes from the UI: overturns and profile
 * FACTS. `carry_list` is frozen until after the demo and needs human signoff,
 * so this reads the row, replaces only `facts`, and writes the object back —
 * every other key is carried through untouched.
 */
async function updateFacts(mutate: (facts: Fact[]) => Fact[]) {
  const [row] = await query<{ profile: unknown }>(
    `SELECT profile FROM store_profile WHERE id = 1`,
  );
  if (!row) return { ok: false as const, error: "No store profile row." };

  const profile =
    typeof row.profile === "string" ? JSON.parse(row.profile) : (row.profile as Record<string, unknown>);

  const current: Fact[] = Array.isArray(profile.facts) ? profile.facts : [];
  profile.facts = mutate(current);

  await query(`UPDATE store_profile SET profile = ? WHERE id = 1`, [JSON.stringify(profile)]);

  revalidatePath("/profile");
  return { ok: true as const };
}

/** Slug that is stable, readable, and unique against the existing ids. */
function makeId(text: string, taken: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .split("_")
      .slice(0, 3)
      .join("_") || "fact";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}_${n}`;
  return id;
}

export async function addFact(text: string, implies?: string) {
  const fact = text.trim();
  if (!fact) return { ok: false as const, error: "Say something about the store." };
  if (fact.length > 400) return { ok: false as const, error: "Keep it under 400 characters." };

  return updateFacts((facts) => [
    ...facts,
    { id: makeId(fact, new Set(facts.map((f) => f.id))), fact, implies: implies?.trim() || null },
  ]);
}

export async function editFact(id: string, text: string) {
  const fact = text.trim();
  if (!fact) return { ok: false as const, error: "Say something about the store." };
  if (fact.length > 400) return { ok: false as const, error: "Keep it under 400 characters." };

  return updateFacts((facts) => facts.map((f) => (f.id === id ? { ...f, fact } : f)));
}

export async function removeFact(id: string) {
  return updateFacts((facts) => facts.filter((f) => f.id !== id));
}
