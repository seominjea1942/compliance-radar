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
/**
 * A span as one line: "Aug 28 – Sep 8, 2026".
 *
 * The year is printed once, at the end, because both ends are almost always
 * in the same one and repeating it reads as two dates rather than a range.
 * When they differ each end carries its own.
 */
export function rangeLabel(from: string, to: string): string {
  const a = utc(from);
  const b = utc(to);
  const day = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" }).format(d);
  const year = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" }).format(d);

  return year(a) === year(b)
    ? `${day(a)} – ${day(b)}, ${year(b)}`
    : `${day(a)}, ${year(a)} – ${day(b)}, ${year(b)}`;
}

/**
 * Pull a lot code and a best-before out of the FDA's free-text `code_info`.
 *
 * Deliberately timid. That field is prose, not a record: 209 distinct shapes
 * in a 400-row sample, running from a bare "AA051526" to "Lots: 509011;
 * 506013; 409012; Expiration: 09/27; 06/27; 09/26". A greedy regex over that
 * happily reports a UPC as a lot number, and a card that states the wrong
 * code sends someone to the wrong shelf.
 *
 * So a value is returned only when the text names it explicitly and names
 * exactly one. Anything carrying a list or a range is left to the caller to
 * print verbatim instead.
 */

/**
 * A best-before has to look like a date.
 *
 * Without this the keyword match happily returns the words that follow it:
 * "Expiration date for both products: 17/06/2026" yielded "for both
 * products", and "Sell By dates: Single retail pack" yielded "dates". Both
 * printed as a confident answer in the Best before cell.
 */
function looksLikeDate(v: string): boolean {
  if (!/\d/.test(v)) return false;
  if (/\d{1,4}\s*[/\-.]\s*\d{1,4}/.test(v)) return true;
  return /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i.test(v);
}

/** Every way the sources write "best before". Longest first: "Best if Used
 *  By" has to win over "Use By" or the match starts mid-phrase. */
const BEST_BEFORE_WORDS =
  "Best if Used By|Best Before|Best By|Best if Used|Sell By|Use By|Used By|Expiration Date|Expiration|Expiry|EXP";

export function productCodes(codeInfo: string | null | undefined): {
  lot: string | null;
  bestBefore: string | null;
} {
  const text = (codeInfo ?? "").trim();
  if (!text) return { lot: null, bestBefore: null };

  /*
   * A list means the single value this would report is a guess. Semicolons
   * only: the sources separate multiple codes with them ("509011; 506013"),
   * while a comma is usually inside one value ("July 28,2026").
   */
  const listy = (from: number) => /;/.test(text.slice(from, from + 60));

  const bbRe = new RegExp(`\\b(?:${BEST_BEFORE_WORDS})\\b\\s*:?\\s*([A-Za-z0-9/ ,.-]{4,24})`, "i");
  const bbMatch = text.match(bbRe);

  /*
   * Named more than once means there is no single answer, whatever separates
   * them. "Lot # 2210321712 with Expiration Date: 01/14/2027, Lot # 2210324609
   * with Expiration Date 01/21/2027, ..." has no semicolon anywhere, so the
   * list check misses it and the first of three dates would be reported as
   * the date.
   */
  const bbCount = (text.match(new RegExp(`\\b(?:${BEST_BEFORE_WORDS})\\b`, "gi")) ?? []).length;
  const lotCount = (text.match(/\b(?:LOTS?|Lots?|Batch)\b/g) ?? []).length;

  let bestBefore: string | null = null;
  if (bbMatch && bbMatch.index !== undefined && bbCount === 1 && !listy(bbMatch.index)) {
    const around = text.slice(Math.max(0, bbMatch.index - 14), bbMatch.index + 44);
    if (!/through|from|\bto\b/i.test(around)) {
      /*
       * The capture runs until the character class stops matching, which is
       * past the end of the date when the next field follows a comma:
       * "01/14/2027, Lot 3821" captured "01/14/2027, Lot". Cut at whatever
       * names the next field, then tidy the punctuation that separated them.
       */
      const candidate = bbMatch[1]
        .split(/\b(?:Lot|LOT|Lots|LOTS|Batch|UPC|Item|Product|Code)\b/)[0]
        .trim()
        .replace(/[.,\-/]+$/, "");
      if (looksLikeDate(candidate)) bestBefore = candidate;
    }
  }

  /*
   * The lot runs from the word to whatever ends it, which is usually the
   * best-before phrase rather than a delimiter: "Lot 5 265 Best if Used By
   * MAR 24 2027" is one lot with a space in it, not a lot of "5". So the
   * best-before is located first and used as the boundary.
   */
  let lot: string | null = null;
  const lotMatch = text.match(/\b(?:LOT|Lot|LOTS|Lots|Batch\/Lot|Batch)\b\s*#?\s*:?\s*/);
  if (lotMatch && lotMatch.index !== undefined && lotCount === 1 && !listy(lotMatch.index)) {
    const from = lotMatch.index + lotMatch[0].length;
    const stop = bbMatch && bbMatch.index !== undefined && bbMatch.index > from ? bbMatch.index : text.length;
    const candidate = text
      .slice(from, stop)
      // A gap of two or more spaces ends the code; what follows is another
      // field the source ran together with it ("2523000012  -10/17/2026").
      .split(/\s{2,}/)[0]
      .trim()
      .replace(/[-.,]$/, "");
    // A code, not a sentence: short, and no lower-case words in it.
    if (candidate && candidate.length <= 20 && /^[A-Z0-9][A-Z0-9 \-\/]*$/.test(candidate)) {
      lot = candidate;
    }
  }

  return { lot, bestBefore };
}

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

/**
 * How long an item has been waiting, e.g. "Flagged 8 days ago".
 *
 * Shown only on items older than the activity window. Those used to be hidden
 * from the action tabs, so the label answers the question their reappearance
 * raises: not when the recall was issued, which the timing line already gives,
 * but how long this has been sitting on the owner's plate.
 */
export function flagged(v: string): string {
  const days = Math.floor((Date.now() - utc(v).getTime()) / 86_400_000);
  if (days < 1) return "Flagged today";
  if (days === 1) return "Flagged yesterday";
  if (days < 30) return `Flagged ${days} days ago`;
  return `Flagged ${new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" }).format(utc(v))}`;
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
