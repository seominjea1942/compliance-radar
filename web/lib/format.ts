/** The DB stores UTC; the store lives in San Jose (contract rule 3). */
export const TZ = "America/Los_Angeles";

/** DB datetimes come back as "YYYY-MM-DD HH:MM:SS" with no zone marker. */
export function utc(v: string): Date {
  return new Date(v.replace(" ", "T") + "Z");
}

export function checkedAt(v: string | null): string | null {
  if (!v) return null;
  const d = utc(v);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);

  const today = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" })
    .format(new Date());

  return day === today ? `Checked today, ${time}` : `Checked ${day}, ${time}`;
}

/** Relative age for the card byline, e.g. "Posted 3 days ago". */
export function posted(v: string): string {
  const diffMs = Date.now() - utc(v).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Posted just now";
  if (hours < 24) return `Posted ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" }).format(utc(v))}`;
}

export function count(n: number): string {
  return n.toLocaleString("en-US");
}
