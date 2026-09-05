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

/**
 * Lot/best-by codes range from "349MCF" to a 692-character list of sell-by
 * dates. Cards are a scanning surface, so they show a code only when it is
 * short enough to read at a glance; anything longer is announced rather than
 * truncated, because half a list of dates is worse than none. The full value
 * lives in the Resolve checklist and on the detail page, which is where the
 * owner actually matches lots.
 */
const CARD_CODE_MAX = 44;

export function cardCode(codeInfo: string | null | undefined): string | null {
  const c = codeInfo?.trim();
  if (!c) return null;
  return c.length <= CARD_CODE_MAX ? c : "multiple date codes";
}

/**
 * "2025-09-05" -> "5 Sep 2025".
 *
 * Date-only strings are formatted from their parts, never through Date():
 * parsing one yields UTC midnight, which formatting in America/Los_Angeles
 * would shift back a day and report the wrong date.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function plainDate(v: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? "");
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}`;
}
