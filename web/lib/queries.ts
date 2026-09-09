import { query } from "./db";
import { flagged, posted, utc } from "./format";

/**
 * Home-screen reads.
 *
 * Per the contract's stack recommendations, the DB views are the query layer:
 * everything here is a `SELECT * FROM v_...` or the one direct surfaced-items
 * query the contract sanctions (section 5). Anything needing a different shape
 * belongs in a new view, not in a bespoke join here.
 *
 * Scope: the 7-day window applies to the activity statistics (the weekly
 * strip, the topic table). It deliberately does NOT apply to the surfaced
 * feed, which is a list of open obligations rather than a report on the week
 * (contract rec #4). The 90-day totals
 * belong to the log/history screens.
 */

export type TopicRow = { id: string; label: string; read: number; forYou: number };

/** The fixed tag set. Exactly these five, in the design's display order. */
export const TAGS = [
  { id: "food-recalls", label: "Food recalls" },
  { id: "city-programs-fees", label: "City programs & fees" },
  { id: "council-routine", label: "Council routine" },
  { id: "nearby-construction", label: "Nearby construction" },
  { id: "labor-workforce", label: "Labor & workforce" },
] as const;

export const WINDOW_DAYS = 7;

/**
 * `tags`, `payload` and `profile` are native MySQL `json` columns. The contract
 * describes them as serialized strings (true of pymysql); HTTP drivers hand
 * back parsed values. Accept both.
 */
export function asJson<T = unknown>(raw: unknown): T | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object") return raw as T;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return null;
}

export function parseTags(raw: unknown): string[] {
  const v = asJson(raw);
  return Array.isArray(v) ? v.filter((t): t is string => typeof t === "string") : [];
}

/* ------------------------------------------------------------------ *
 * 1. v_weekly_summary: the home strip
 * ------------------------------------------------------------------ */

export type SourceRow = {
  source: string;
  reviewed: number;
  surfaced: number;
  filtered: number;
};

export type WeeklySummary = {
  reviewed: number;
  surfaced: number;
  filtered: number;
  bySource: SourceRow[];
};

export async function getWeeklySummary(): Promise<WeeklySummary> {
  const rows = await query<{
    source: string;
    reviewed: number | string;
    surfaced: number | string;
    filtered: number | string;
  }>(`SELECT * FROM v_weekly_summary`);

  // NOTE (contract): on quiet weeks a source has no row at all, so this sums
  // whatever is present rather than assuming five rows.
  const bySource = rows.map((r) => ({
    source: r.source,
    reviewed: Number(r.reviewed),
    surfaced: Number(r.surfaced),
    filtered: Number(r.filtered),
  }));

  return {
    reviewed: bySource.reduce((n, r) => n + r.reviewed, 0),
    surfaced: bySource.reduce((n, r) => n + r.surfaced, 0),
    filtered: bySource.reduce((n, r) => n + r.filtered, 0),
    bySource,
  };
}

/* ------------------------------------------------------------------ *
 * 1b. v_weekly_topics: the per-tag home table
 * ------------------------------------------------------------------ */

const TAG_LABEL = new Map(TAGS.map((t) => [t.id, t.label]));

export async function getWeeklyTopics(): Promise<TopicRow[]> {
  const rows = await query<{ tag: string; read: number | string; for_you: number | string }>(
    `SELECT * FROM v_weekly_topics`,
  );
  const byTag = new Map(rows.map((r) => [r.tag, r]));

  // Iterate the fixed tag set so display order is ours and a tag the view
  // ever drops still renders as a quiet row rather than vanishing.
  return TAGS.map((t) => {
    const r = byTag.get(t.id);
    return {
      id: t.id,
      label: TAG_LABEL.get(t.id) ?? t.id,
      read: Number(r?.read ?? 0),
      forYou: Number(r?.for_you ?? 0),
    };
  });
}

/* ------------------------------------------------------------------ *
 * 1c. v_run_status: the trust stamp
 * ------------------------------------------------------------------ */

/**
 * Last pipeline run, including quiet runs that triaged nothing. Replaces
 * MAX(created_at), which reported the last *item* and so lied on quiet days.
 * NULL until the first run row exists; the UI says "not yet checked".
 */
export async function getLastChecked(): Promise<string | null> {
  const [row] = await query<{ last_checked: string | null }>(
    `SELECT last_checked FROM v_run_status`,
  );
  return row?.last_checked ?? null;
}

/* ------------------------------------------------------------------ *
 * 2. v_surfaced_feed: the alerts feed
 * ------------------------------------------------------------------ */

/**
 * What the backend decided this item asks of the owner.
 *   act    = the store is affected on the stated facts (a carry-list match)
 *   verify = one concrete check exists
 *   fyi    = awareness only
 * NULL on rows triaged before the field existed, or missed by the backfill.
 */
export type ActionType = "act" | "verify" | "fyi";

/** Display tiers. `priority-verify` is a verify item that should not wait. */
export type Severity = "act" | "priority-verify" | "verify" | "fyi";

/** Feed order: tier first, then newest within a tier. */
const SEVERITY_RANK: Record<Severity, number> = {
  act: 0,
  "priority-verify": 1,
  verify: 2,
  fyi: 3,
};

/**
 * Structured product record, extracted at ingest.
 *
 * Coverage across surfaced recall rows: product_name and code_info ~93%,
 * sizes ~85%, brand ~78%, upcs ~59%, containers ~37%. Only the first two are
 * safe to build layout around; the rest must vanish cleanly when absent.
 */
export type ProductRecord = {
  productName: string | null;
  brand: string | null;
  sizes: string[];
  /** Only verified complete UPCs are stored, so partial ones never appear. */
  upcs: string[];
  containers: string[];
  /** Lot and best-by codes, e.g. "BEST BY: 27 DEC 26". The shelf-check key. */
  codeInfo: string | null;
  /** Recall scale, e.g. "3,515 cases (8 units/case)". */
  quantity: string | null;
};

export type SurfacedItem = {
  decisionId: string;
  title: string;
  source: string;
  sourceLabel: string;
  decision: "ALERT" | "OPPORTUNITY";
  actionType: ActionType | null;
  /** One-clause display variant; use this in list rows. */
  shortReason: string;
  /** Full recorded rationale; detail views only. */
  reason: string;
  tags: string[];
  profileFactId: string | null;
  createdAtUtc: string;
  severity: Severity;
  /** FDA recall class where the source provides one; null on fda_rss. */
  classification: string | null;
  /** Hearing / issue / recall date, when the payload carries one. */
  timingLabel: string | null;
  /** Rendered server-side so SSR and hydration cannot disagree on the clock. */
  postedLabel: string;
  /**
   * "Flagged 8 days ago", only on items older than the activity window; null
   * on recent ones, where it would be noise. The card's timing line reports
   * the event's own date, which says nothing about how long this has waited.
   */
  agedLabel: string | null;
  /** Rows sharing this are one real-world recall event. Never inferred here. */
  eventKey: string | null;
  /** handled | not_carried once the owner has closed it; null while open. */
  resolution: string | null;
  /** Recalling firm, and the backend's compressed hazard (recall rows only). */
  firm: string | null;
  hazard: string | null;
  /** Null on non-recall sources. */
  product: ProductRecord | null;
  /**
   * FDA's own product photos, thumbnails, absolute URLs. Only `fda_rss` rows
   * carry these: an openFDA enforcement report has no press page to scrape,
   * so an empty list is the normal case, not a gap.
   */
  images: string[];
  /**
   * What to show as this row's headline: the extracted product name where the
   * extraction succeeded, else the source title. Never a truncated guess.
   */
  displayTitle: string;
};

const SOURCE_LABEL: Record<string, string> = {
  openfda_enforcement: "FDA · Recall",
  fda_rss: "FDA · Recall",
  fsis_email: "FSIS · Recall",
  legistar: "City Council",
  permits: "Permit",
};

/**
 * Pathogen terms, used ONLY to promote an item within the verify tier.
 *
 * The contract asks for Class I / pathogen verify items to outrank ordinary
 * ones. `classification` is missing on every fda_rss row (the sprouts recalls
 * included), so classification alone cannot lift them and the backend
 * explicitly sanctioned reading the reason text here.
 *
 * Kept deliberately narrow: it only reorders a list. It never decides whether
 * something surfaces, and it never sets an action_type. A pathogen flag on the
 * decision would be better than this list, and is worth asking for later.
 */
const PATHOGENS = /\b(e\.?\s?coli|salmonella|listeria|botulism|cronobacter|hepatitis a)\b/i;

/**
 * Display tier from the backend's action_type, with one promotion rule.
 *
 * action_type is the ranking signal, so severity no longer guesses from FDA
 * class. Class only breaks ties inside `verify`, per the contract.
 */
function severityOf(
  actionType: ActionType | null,
  classification: string | null,
  text: string,
): Severity {
  if (actionType === "act") return "act";
  if (actionType === "fyi") return "fyi";
  // verify, or NULL where the backfill has not reached yet: treat unknown as
  // verify rather than dropping it to the bottom, so it stays visible.
  return classification === "Class I" || PATHOGENS.test(text) ? "priority-verify" : "verify";
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];
}

function readProduct(payload: Record<string, unknown>): ProductRecord | null {
  const p = payload.product as Record<string, unknown> | undefined;
  const codeInfo = typeof payload.code_info === "string" ? payload.code_info.trim() : null;
  const quantity =
    typeof payload.product_quantity === "string" ? payload.product_quantity.trim() : null;

  if (!p && !codeInfo && !quantity) return null;

  return {
    productName: typeof p?.product_name === "string" ? p.product_name.trim() : null,
    brand: typeof p?.brand === "string" ? p.brand.trim() : null,
    sizes: strList(p?.sizes),
    upcs: strList(p?.upcs),
    containers: strList(p?.containers),
    codeInfo: codeInfo || null,
    quantity: quantity || null,
  };
}

/** "20260602" -> "2026-06-02". openFDA packs dates without separators. */
function fdaDate(v: unknown): string | null {
  return typeof v === "string" && /^\d{8}$/.test(v)
    ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`
    : null;
}

export async function getSurfaced(): Promise<SurfacedItem[]> {
  const rows = await query<{
    decision_id: string | number;
    title: string;
    source: string;
    decision: "ALERT" | "OPPORTUNITY";
    action_type: ActionType | null;
    reason: string;
    short_reason: string | null;
    tags: unknown;
    profile_fact_id: string | null;
    created_at: string;
    payload: unknown;
    event_key: string | null;
    resolution: string | null;
    hazard: string | null;
  }>(
    /*
     * Resolved rows are fetched, not filtered out in SQL. A card needs to know
     * how many of its products the owner already closed in order to say "3 of 5
     * resolved"; grouping then drops any event with nothing left open.
     */
    /*
     * Deliberately not time-scoped. The action tabs are a list of open
     * obligations, not an activity report: an unresolved item does not stop
     * needing attention because a week passed. Applying the weekly window here
     * made 45 of 48 open items vanish once the backfill's dates aged out.
     * The window still governs the "read this week" strip and the topic table,
     * which really are weekly statistics (contract rec #4).
     */
    `SELECT * FROM v_surfaced_feed`,
  );

  const items = rows.map((r) => {
    const payload = asJson<Record<string, unknown>>(r.payload) ?? {};
    const product = readProduct(payload);
    const classification =
      typeof payload.classification === "string" ? payload.classification : null;

    const timingLabel =
      typeof payload.meeting_date === "string"
        ? `Meeting ${payload.meeting_date}`
        : typeof payload.issue_date === "string"
          ? `Issued ${payload.issue_date}`
          : fdaDate(payload.recall_initiation_date)
            ? `Recall initiated ${fdaDate(payload.recall_initiation_date)}`
            : null;

    return {
      // Contract rule 2: BIGINT ids stay strings.
      decisionId: String(r.decision_id),
      title: r.title,
      source: r.source,
      sourceLabel: SOURCE_LABEL[r.source] ?? r.source,
      decision: r.decision,
      actionType: r.action_type,
      // Fall back to the full reason if a row predates the backfill.
      shortReason: r.short_reason ?? r.reason,
      reason: r.reason,
      tags: parseTags(r.tags),
      profileFactId: r.profile_fact_id,
      createdAtUtc: r.created_at,
      severity: severityOf(r.action_type, classification, `${r.title} ${r.reason}`),
      classification,
      timingLabel,
      postedLabel: posted(r.created_at),
      images: strList(payload.images),
      agedLabel: Date.now() - utc(r.created_at).getTime() > WINDOW_DAYS * 86_400_000
        ? flagged(r.created_at)
        : null,
      eventKey: r.event_key,
      resolution: r.resolution,
      product,
      displayTitle: product?.productName || r.title,
      firm: typeof payload.recalling_firm === "string" ? payload.recalling_firm : null,
      // Supplied by the backend, compressed from the record's own wording under
      // a no-invention rule. Null on non-recall sources.
      hazard: r.hazard,
    };
  });

  /*
   * The tier depends on payload and text, so the ordering cannot live in SQL.
   * Sorting here puts what the store must act on above what it merely needs to
   * check; ties fall back to newest.
   */
  return items.sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return b.createdAtUtc.localeCompare(a.createdAtUtc);
  });
}

/* ------------------------------------------------------------------ *
 * 3. v_nearby_permits: the home map
 * ------------------------------------------------------------------ */

export type Permit = {
  documentId: string;
  title: string;
  lat: number;
  lon: number;
  status: string | null;
  distanceM: number | null;
  decision: string;
};

/** Store anchor, per the contract. */
/**
 * 1287 Lincoln Ave, per the contract (corrected there 2026-09-03).
 *
 * The previous value sat 359m north, which the decorative map plate could not
 * reveal: it had no real geography to be wrong against. Under real tiles the
 * store pin landed most of a quarter mile from the store, on a card whose own
 * copy says "within a quarter mile".
 */
export const STORE_ANCHOR = { lat: 37.3053, lon: -121.899 };

export async function getNearbyPermits(): Promise<Permit[]> {
  const rows = await query<{
    document_id: string | number;
    title: string;
    lat: string | null;
    lon: string | null;
    status: string | null;
    distance_from_store_m: string | null;
    decision: string;
  }>(`SELECT * FROM v_nearby_permits`);

  return rows
    .map((r) => ({
      documentId: String(r.document_id),
      title: r.title,
      // lat/lon/distance come back as strings; parseFloat them (contract).
      lat: parseFloat(String(r.lat ?? "")),
      lon: parseFloat(String(r.lon ?? "")),
      status: r.status,
      distanceM:
        r.distance_from_store_m === null ? null : parseFloat(String(r.distance_from_store_m)),
      decision: r.decision,
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

/* ------------------------------------------------------------------ *
 * 4. store_profile
 * ------------------------------------------------------------------ */

export type StoreFact = { id: string; fact: string; implies: string | null };

export type CarryEntry = { category: string; brands: string[]; carries: boolean };

export type StoreProfile = {
  storeName: string;
  owner: string | null;
  location: string | null;
};

export type StoreProfileFull = StoreProfile & {
  facts: StoreFact[];
  carry: { entries: CarryEntry[]; granularity: string | null; source: string | null };
};

/** `location` is an object: {city, neighborhood, state, zip_codes_nearby}. */
function locationLabel(loc: unknown): string | null {
  if (typeof loc === "string") return loc;
  if (!loc || typeof loc !== "object") return null;
  const l = loc as Record<string, unknown>;
  const parts = [l.neighborhood, l.city].filter((v): v is string => typeof v === "string");
  return parts.length ? parts.join(", ") : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/** Full profile for the store-profile screen. */
export async function getStoreProfileFull(): Promise<StoreProfileFull | null> {
  const [row] = await query<{ profile: unknown }>(
    `SELECT profile FROM store_profile WHERE id = 1`,
  );
  const p = asJson<Record<string, unknown>>(row?.profile);
  if (!p) return null;

  const facts = Array.isArray(p.facts)
    ? (p.facts as Record<string, unknown>[])
        .map((f) => ({ id: str(f.id) ?? "", fact: str(f.fact) ?? "", implies: str(f.implies) }))
        .filter((f) => f.fact)
    : [];

  const carryList = (p.carry_list ?? {}) as Record<string, unknown>;
  const entries = Array.isArray(carryList.entries)
    ? (carryList.entries as Record<string, unknown>[])
        .map((e) => ({
          category: str(e.category) ?? "",
          brands: Array.isArray(e.brands)
            ? (e.brands as unknown[]).filter((b): b is string => typeof b === "string")
            : [],
          carries: e.carries !== false,
        }))
        .filter((e) => e.category)
    : [];

  return {
    storeName: str(p.store_name) ?? "Store",
    owner: str(p.owner),
    location: locationLabel(p.location),
    facts,
    carry: { entries, granularity: str(carryList.granularity), source: str(carryList.source) },
  };
}

export async function getStoreProfile(): Promise<StoreProfile | null> {
  const [row] = await query<{ profile: unknown }>(
    `SELECT profile FROM store_profile WHERE id = 1`,
  );
  const p = asJson<Record<string, unknown>>(row?.profile);
  if (!p) return null;
  return {
    storeName: typeof p.store_name === "string" ? p.store_name : "Store",
    owner: typeof p.owner === "string" ? p.owner : null,
    location: locationLabel(p.location),
  };
}

/* ------------------------------------------------------------------ *
 * 5. v_filtered_log: the log screen
 * ------------------------------------------------------------------ */

/** Source groups the log filters by, mapped to the DB's source values. */
export const SOURCE_GROUPS = {
  recalls: ["openfda_enforcement", "fda_rss", "fsis_email"],
  council: ["legistar"],
  permits: ["permits"],
} as const;

export type SourceGroup = keyof typeof SOURCE_GROUPS;
/**
 * The two states a rejected item can be in, plus the union of both.
 *
 * Both names are the honest ones. "Filtered" collided with the topic
 * filters on the same screen, so the state and the control that narrows it
 * shared a word; "set-aside" is what the reason lines have always called it.
 * "Resolved" was simply wrong: these rows are overturns, and resolution
 * (handled / not carried) belongs to surfaced items and never reaches the
 * log at all.
 */
export type LogStatus = "all" | "set-aside" | "overturned";

export type LogRow = {
  decisionId: string;
  title: string;
  source: string;
  sourceLabel: string;
  reason: string;
  shortReason: string;
  tags: string[];
  createdAtUtc: string;
  postedLabel: string;
  overturned: boolean;
};

export type LogPage = {
  rows: LogRow[];
  /** Scoped to the current filters: what the tabs on screen describe. */
  counts: { all: number; setAside: number; overturned: number };
  /**
   * The whole log, ignoring every filter. The rail's badge reads from it,
   * and so do the status tabs: a tab is a destination, and a count that
   * changed with the topic pills was describing the trip already taken.
   */
  overall: { all: number; setAside: number; overturned: number };
  hasMore: boolean;
};

/**
 * One page of the rejection log.
 *
 * Filtering happens in SQL against the view rather than in TS, so "load more"
 * pages the database instead of shipping 512 rows to the browser to hide most
 * of them.
 */
export async function getFilteredLog(opts: {
  status?: LogStatus;
  source?: SourceGroup | "all";
  /** One of TAGS. Narrows the log to a single topic. */
  tag?: string | null;
  /** Free-text match over the title and the filtering reason. */
  q?: string | null;
  limit?: number;
} = {}): Promise<LogPage> {
  const status = opts.status ?? "set-aside";
  const source = opts.source ?? "all";
  const tag = TAGS.some((t) => t.id === opts.tag) ? opts.tag! : null;
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 500);

  /*
   * LIKE, not full text: the log is ~750 rows, the owner searches for a brand
   * they half-remember ("Fromm"), and a prefix-only index would miss it inside
   * a longer product title. The wildcards are added here so the caller cannot
   * inject them; `%` and `_` in the query itself are escaped to stay literal.
   */
  const q = (opts.q ?? "").trim();
  const like = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;

  const where: string[] = [];
  const params: unknown[] = [];

  if (status === "set-aside") where.push("overturned = 0");
  if (status === "overturned") where.push("overturned = 1");

  if (source !== "all") {
    const list = SOURCE_GROUPS[source];
    where.push(`source IN (${list.map(() => "?").join(",")})`);
    params.push(...list);
  }

  // `tags` is a JSON array on the view, so membership is a JSON predicate
  // rather than an equality: the tag is passed as a JSON scalar.
  if (tag) {
    where.push("JSON_CONTAINS(tags, ?)");
    params.push(JSON.stringify(tag));
  }

  if (like) {
    where.push("(title LIKE ? OR reason LIKE ?)");
    params.push(like, like);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // The tab counts have to answer "of what is on screen". Scoped to the same
  // topic, or a topic with 3 rows reads "Showing 3 of 514".
  const totalsWhere: string[] = [];
  const totalsParams: unknown[] = [];
  if (source !== "all") {
    const list = SOURCE_GROUPS[source];
    totalsWhere.push(`source IN (${list.map(() => "?").join(",")})`);
    totalsParams.push(...list);
  }
  if (tag) {
    totalsWhere.push("JSON_CONTAINS(tags, ?)");
    totalsParams.push(JSON.stringify(tag));
  }
  if (like) {
    totalsWhere.push("(title LIKE ? OR reason LIKE ?)");
    totalsParams.push(like, like);
  }
  const totalsClause = totalsWhere.length ? `WHERE ${totalsWhere.join(" AND ")}` : "";

  // One extra row tells us whether a "load more" link is warranted.
  const rows = await query<{
    decision_id: string | number;
    title: string;
    source: string;
    reason: string;
    short_reason: string | null;
    tags: unknown;
    created_at: string;
    overturned: number;
  }>(`SELECT * FROM v_filtered_log ${clause} LIMIT ?`, [...params, limit + 1]);

  const [totals] = await query<{ total: number | string; resolved: number | string | null }>(
    `SELECT COUNT(*) AS total, SUM(overturned = 1) AS resolved FROM v_filtered_log ${totalsClause}`,
    totalsParams,
  );

  // The rail's badge counts the whole log, not the slice being viewed: it is
  // global navigation, and a count that moved every time a filter changed
  // would be reporting the current screen rather than the destination.
  const narrowed = source !== "all" || tag !== null || like !== null;
  const [everything] = narrowed
    ? await query<{ total: number | string; resolved: number | string | null }>(
        `SELECT COUNT(*) AS total, SUM(overturned = 1) AS resolved FROM v_filtered_log`,
      )
    : [totals];

  const all = Number(totals?.total ?? 0);
  const resolved = Number(totals?.resolved ?? 0);

  return {
    rows: rows.slice(0, limit).map((r) => ({
      decisionId: String(r.decision_id),
      title: r.title,
      source: r.source,
      sourceLabel: SOURCE_LABEL[r.source] ?? r.source,
      reason: r.reason,
      shortReason: r.short_reason ?? r.reason,
      tags: parseTags(r.tags),
      createdAtUtc: r.created_at,
      postedLabel: posted(r.created_at),
      overturned: Number(r.overturned) === 1,
    })),
    counts: { all, overturned: resolved, setAside: all - resolved },
    overall: {
      all: Number(everything?.total ?? 0),
      setAside: Number(everything?.total ?? 0) - Number(everything?.resolved ?? 0),
      overturned: Number(everything?.resolved ?? 0),
    },
    hasMore: rows.length > limit,
  };
}

/**
 * The span the radar can actually answer for: its first stored decision to
 * its last. Read from the data rather than a fixed window, so the label can
 * never claim a range the database does not hold.
 */
export async function getDataRange(): Promise<{ from: string; to: string } | null> {
  const [r] = await query<{ a: string | null; b: string | null }>(
    `SELECT MIN(created_at) AS a, MAX(created_at) AS b FROM triage_decisions`,
  );
  if (!r?.a || !r?.b) return null;
  return { from: r.a, to: r.b };
}

/* ------------------------------------------------------------------ *
 * 6. One decision: the detail route
 * ------------------------------------------------------------------ */

export type DecisionDetail = {
  decisionId: string;
  title: string;
  /** Extracted product name where available, else the source title. */
  displayTitle: string;
  source: string;
  sourceLabel: string;
  /** Surfaced items came from v_surfaced_feed; filtered ones from the log. */
  surfaced: boolean;
  overturned: boolean;
  actionType: ActionType | null;
  severity: Severity | null;
  reason: string;
  shortReason: string;
  tags: string[];
  createdAtUtc: string;
  postedLabel: string;
  classification: string | null;
  /**
   * Null for filtered items: v_filtered_log does not expose `payload`, so the
   * provenance panel has nothing to read. Requested from the backend rather
   * than joining documents here.
   */
  payload: Record<string, unknown> | null;
};

export async function getDecisionDetail(id: string): Promise<DecisionDetail | null> {
  if (!/^\d{1,20}$/.test(id)) return null;

  const [hit] = await query<{
    decision_id: string | number;
    title: string;
    source: string;
    action_type: ActionType | null;
    reason: string;
    short_reason: string | null;
    tags: unknown;
    created_at: string;
    payload: unknown;
  }>(`SELECT * FROM v_surfaced_feed WHERE decision_id = ?`, [id]);

  if (hit) {
    const payload = asJson<Record<string, unknown>>(hit.payload) ?? {};
    const classification =
      typeof payload.classification === "string" ? payload.classification : null;
    const productName = (asJson<Record<string, unknown>>(payload.product) ?? {}).product_name;
    return {
      decisionId: String(hit.decision_id),
      title: hit.title,
      displayTitle: typeof productName === "string" && productName.trim() ? productName : hit.title,
      source: hit.source,
      sourceLabel: SOURCE_LABEL[hit.source] ?? hit.source,
      surfaced: true,
      overturned: false,
      actionType: hit.action_type,
      severity: severityOf(hit.action_type, classification, `${hit.title} ${hit.reason}`),
      reason: hit.reason,
      shortReason: hit.short_reason ?? hit.reason,
      tags: parseTags(hit.tags),
      createdAtUtc: hit.created_at,
      postedLabel: posted(hit.created_at),
      classification,
      payload,
    };
  }

  const [row] = await query<{
    decision_id: string | number;
    title: string;
    source: string;
    reason: string;
    short_reason: string | null;
    tags: unknown;
    created_at: string;
    overturned: number;
  }>(`SELECT * FROM v_filtered_log WHERE decision_id = ?`, [id]);

  if (!row) return null;

  return {
    decisionId: String(row.decision_id),
    title: row.title,
    // v_filtered_log carries no payload, so there is no extraction to prefer.
    displayTitle: row.title,
    source: row.source,
    sourceLabel: SOURCE_LABEL[row.source] ?? row.source,
    surfaced: false,
    overturned: Number(row.overturned) === 1,
    actionType: null,
    severity: null,
    reason: row.reason,
    shortReason: row.short_reason ?? row.reason,
    tags: parseTags(row.tags),
    createdAtUtc: row.created_at,
    postedLabel: posted(row.created_at),
    classification: null,
    payload: null,
  };
}

/* ------------------------------------------------------------------ *
 * 2b. Event grouping: one card per real-world recall event
 * ------------------------------------------------------------------ */

export type SurfacedEvent = {
  /** Stable key for React and for the resolve flow. */
  key: string;
  /** Products still open. The card lists these and resolves against them. */
  items: SurfacedItem[];
  /** Every product in the event, including ones already closed. */
  allItems: SurfacedItem[];
  /** How many the owner has already closed. Drives the "N of M" line. */
  resolvedCount: number;
  /** The row whose framing the card borrows: highest tier, then newest. */
  lead: SurfacedItem;
  /** Highest tier in the group, so a group is ranked by its worst member. */
  severity: Severity;
  isGroup: boolean;
  firm: string | null;
  hazard: string | null;
};

/**
 * Group the feed on `event_key`.
 *
 * Grouping is never inferred from titles or firms: rows without an event_key
 * stand alone, which is also what a genuine single-item event looks like.
 */
export function groupSurfaced(items: SurfacedItem[]): SurfacedEvent[] {
  const buckets = new Map<string, SurfacedItem[]>();

  for (const item of items) {
    // No key means "not known to be part of an event", so it gets its own
    // bucket rather than being lumped in with other keyless rows.
    const key = item.eventKey ? `e:${item.eventKey}` : `d:${item.decisionId}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  const events: SurfacedEvent[] = [];

  for (const [key, group] of buckets) {
    const ranked = [...group].sort((a, b) => {
      const tier = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      return tier !== 0 ? tier : b.createdAtUtc.localeCompare(a.createdAtUtc);
    });

    const open = ranked.filter((i) => !i.resolution);
    // Fully resolved events leave the feed entirely.
    if (open.length === 0) continue;

    const lead = open[0]!;

    events.push({
      key,
      items: open,
      allItems: ranked,
      resolvedCount: ranked.length - open.length,
      lead,
      severity: lead.severity,
      isGroup: open.length > 1,
      firm: ranked.find((i) => i.firm)?.firm ?? null,
      hazard: ranked.find((i) => i.hazard)?.hazard ?? null,
    });
  }

  return events.sort((a, b) => {
    const tier = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (tier !== 0) return tier;
    return b.lead.createdAtUtc.localeCompare(a.lead.createdAtUtc);
  });
}

/* ------------------------------------------------------------------ *
 * 7. v_street_work: what can actually block the block
 * ------------------------------------------------------------------ */

export type StreetWork = {
  documentId: string;
  title: string;
  /**
   * street_excavation_permit is live work (Issued, unexpired, unfinaled).
   * pavement_moratorium is a recently paved no-dig segment: protective
   * context, never a warning. pavement_project_* is planned repaving.
   */
  workType: string;
  status: string | null;
  /** Human street range, e.g. "From Willow St To Minnesota Ave". */
  segment: string | null;
  /** City text naming the utility and the job. Not generated. */
  workDescription: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  /** Segment or description names the store's own street. */
  onStoreStreet: boolean;
  projectYear: string | null;
  lat: number;
  lon: number;
  distanceM: number | null;
  decision: string;
  actionType: ActionType | null;
  shortReason: string;
};

/** The card counts what is close enough to affect the store's own block. */
export const BLOCK_RADIUS_M = 400;

export async function getStreetWork(): Promise<StreetWork[]> {
  const rows = await query<{
    document_id: string | number;
    title: string;
    work_type: string;
    status: string | null;
    segment: string | null;
    work_description: string | null;
    issue_date: string | null;
    expiry_date: string | null;
    on_store_street: string | boolean | null;
    project_year: string | number | null;
    lat: string | null;
    lon: string | null;
    distance_from_store_m: string | null;
    decision: string;
    action_type: ActionType | null;
    short_reason: string | null;
    reason: string;
  }>(`SELECT * FROM v_street_work`);

  return rows
    .map((r) => ({
      documentId: String(r.document_id),
      title: r.title,
      workType: r.work_type,
      status: r.status,
      segment: r.segment,
      workDescription: r.work_description,
      issueDate: r.issue_date,
      expiryDate: r.expiry_date,
      // The view returns this as a string; accept either shape.
      onStoreStreet: r.on_store_street === true || r.on_store_street === "true",
      projectYear: r.project_year === null ? null : String(r.project_year),
      lat: parseFloat(String(r.lat ?? "")),
      lon: parseFloat(String(r.lon ?? "")),
      distanceM:
        r.distance_from_store_m === null ? null : parseFloat(String(r.distance_from_store_m)),
      decision: r.decision,
      actionType: r.action_type,
      shortReason: r.short_reason ?? r.reason,
    }))
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
    /*
     * Contract ordering: the store's own street first, then by distance. Work
     * on Lincoln matters more than work 100m nearer on a parallel street the
     * deliveries never use.
     */
    .sort((a, b) => {
      if (a.onStoreStreet !== b.onStoreStreet) return a.onStoreStreet ? -1 : 1;
      return (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity);
    });
}

/** Live digs. Excludes moratorium segments and planned repaving. */
export function activePermits(work: StreetWork[]): StreetWork[] {
  return work.filter((w) => w.workType === "street_excavation_permit");
}

/** Recently paved, no-dig segments: protective context, never a warning. */
export function moratoriumSegments(work: StreetWork[]): StreetWork[] {
  return work.filter((w) => w.workType === "pavement_moratorium");
}

export function plannedPaving(work: StreetWork[]): StreetWork[] {
  return work.filter((w) => w.workType.startsWith("pavement_project"));
}

/**
 * What the card leads with: work the backend judged actually disruptive and
 * close enough to matter. Zero of these is the answer, not an empty state.
 */
export function blockingWork(work: StreetWork[]): StreetWork[] {
  return activePermits(work).filter(
    (w) => w.decision === "ALERT" && w.distanceM !== null && w.distanceM <= BLOCK_RADIUS_M,
  );
}
