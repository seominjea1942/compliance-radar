/**
 * Resolution outcomes, matching the contract's `resolution` column.
 *
 * Kept out of the "use server" module: such a file may only export async
 * functions, so a constant exported from there is rewritten into a server
 * reference and is not usable on the client.
 */
export const RESOLUTIONS = [
  { value: "handled", label: "Handled" },
  { value: "not_carried", label: "Don't carry" },
] as const;

export type Resolution = (typeof RESOLUTIONS)[number]["value"];

export const RESOLUTION_VALUES: ReadonlySet<string> = new Set(RESOLUTIONS.map((r) => r.value));
