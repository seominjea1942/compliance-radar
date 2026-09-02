import { query } from "./db";
import { posted } from "./format";

/**
 * Home-screen reads.
 *
 * Per the contract's stack recommendations, the DB views are the query layer:
 * everything here is a `SELECT * FROM v_...` or the one direct surfaced-items
 * query the contract sanctions (section 5). Anything needing a different shape
 * belongs in a new view, not in a bespoke join here.
 *
 * Scope is the current 7-day window (recommendation 4). The 90-day totals
 * belong to the log/history screens.
 */

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
 * 1. v_weekly_summary — the home strip
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
 * 2. Surfaced items — the contract's sanctioned direct query (section 5),
 *    time-scoped to the home screen's 7-day window.
 * ------------------------------------------------------------------ */

/** Three levels, per the design: urgent, worth knowing, logged. */
export type Severity = "urgent" | "worth-knowing" | "logged";

/** Feed order: severity first, then newest within a severity. */
const SEVERITY_RANK: Record<Severity, number> = {
  urgent: 0,
  "worth-knowing": 1,
  logged: 2,
};

export type SurfacedItem = {
  decisionId: string;
  title: string;
  source: string;
  sourceLabel: string;
  decision: "ALERT" | "OPPORTUNITY";
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
};

const SOURCE_LABEL: Record<string, string> = {
  openfda_enforcement: "FDA · Recall",
  fda_rss: "FDA · Recall",
  fsis_email: "FSIS · Recall",
  legistar: "City Council",
  permits: "Permit",
};

/**
 * Severity from what the record actually says.
 *
 * openFDA carries `classification`; Class I is the FDA's own "reasonable
 * probability of serious harm" tier, so it maps to urgent. The contract
 * suggests deriving urgency from reason text where classification is missing
 * (fda_rss); that is left undone deliberately, because keyword-sniffing prose
 * would manufacture a severity the record does not state.
 */
function severityOf(classification: string | null, decision: string): Severity {
  if (decision === "OPPORTUNITY") return "logged";
  if (classification === "Class I") return "urgent";
  if (classification === "Class III") return "logged";
  return "worth-knowing";
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
    reason: string;
    tags: unknown;
    profile_fact_id: string | null;
    created_at: string;
    payload: unknown;
  }>(
    `SELECT d.id AS decision_id, doc.title, doc.source, d.decision, d.reason,
            d.tags, d.profile_fact_id, d.created_at, doc.payload
       FROM triage_decisions d
       JOIN documents doc ON doc.id = d.document_id
      WHERE d.decision IN ('ALERT','OPPORTUNITY')
        AND d.created_at >= NOW() - INTERVAL ? DAY
      ORDER BY d.created_at DESC`,
    [WINDOW_DAYS],
  );

  const items = rows.map((r) => {
    const payload = asJson<Record<string, unknown>>(r.payload) ?? {};
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
      reason: r.reason,
      tags: parseTags(r.tags),
      profileFactId: r.profile_fact_id,
      createdAtUtc: r.created_at,
      severity: severityOf(classification, r.decision),
      classification,
      timingLabel,
      postedLabel: posted(r.created_at),
    };
  });

  /*
   * Severity is derived from the payload, so the ordering cannot live in the
   * SQL. Sorting here keeps a Class I recall above routine permits instead of
   * letting ingestion time decide what the owner sees first; ties fall back to
   * newest, which is the order the query already returned.
   */
  return items.sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return b.createdAtUtc.localeCompare(a.createdAtUtc);
  });
}

/* ------------------------------------------------------------------ *
 * 3. v_nearby_permits — the home map
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
export const STORE_ANCHOR = { lat: 37.3085, lon: -121.8995 };

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

export type StoreProfile = {
  storeName: string;
  owner: string | null;
  location: string | null;
};

/** `location` is an object: {city, neighborhood, state, zip_codes_nearby}. */
function locationLabel(loc: unknown): string | null {
  if (typeof loc === "string") return loc;
  if (!loc || typeof loc !== "object") return null;
  const l = loc as Record<string, unknown>;
  const parts = [l.neighborhood, l.city].filter((v): v is string => typeof v === "string");
  return parts.length ? parts.join(", ") : null;
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
