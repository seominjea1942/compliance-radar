import "server-only";
import { query } from "./db";
import { posted } from "./format";

/**
 * Home-screen reads. Every shape here comes from docs/ui-data-contract.md.
 * Nothing on this page is invented: if the DB has no value for something the
 * design shows, the field is null and the component omits it.
 */

/** The fixed tag set. Exactly these five, in the design's display order. */
export const TAGS = [
  { id: "food-recalls", label: "Food recalls" },
  { id: "city-programs-fees", label: "City programs & fees" },
  { id: "council-routine", label: "Council routine" },
  { id: "nearby-construction", label: "Nearby construction" },
  { id: "labor-workforce", label: "Labor & workforce" },
] as const;

export const WINDOW_DAYS = 90;

/**
 * `tags`, `payload` and `profile` are native MySQL `json` columns. pymysql
 * hands them back as strings (which is what the data contract describes), but
 * mysql2 parses them into JS values first. Accept both so the same code works
 * whichever driver shape arrives.
 */
function asJson<T = unknown>(raw: unknown): T | null {
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

function parseTags(raw: unknown): string[] {
  const v = asJson(raw);
  return Array.isArray(v) ? v.filter((t): t is string => typeof t === "string") : [];
}

export type TopicRow = { id: string; label: string; read: number; forYou: number };

export type Headline = {
  reviewed: number;
  surfaced: number;
  filtered: number;
  topics: TopicRow[];
  /** MAX(created_at) across decisions; the "checked at" stamp. Null if empty. */
  lastCheckedUtc: string | null;
};

export async function getHeadline(): Promise<Headline> {
  const rows = await query<{ tags: unknown; decision: string; n: number }>(
    `SELECT tags, decision, COUNT(*) AS n
       FROM triage_decisions
      WHERE created_at >= NOW() - INTERVAL ? DAY
      GROUP BY tags, decision`,
    [WINDOW_DAYS],
  );

  const read = new Map<string, number>();
  const forYou = new Map<string, number>();
  let reviewed = 0;
  let surfaced = 0;

  for (const r of rows) {
    const n = Number(r.n);
    const isSurfaced = r.decision === "ALERT" || r.decision === "OPPORTUNITY";
    reviewed += n;
    if (isSurfaced) surfaced += n;
    for (const t of parseTags(r.tags)) {
      read.set(t, (read.get(t) ?? 0) + n);
      if (isSurfaced) forYou.set(t, (forYou.get(t) ?? 0) + n);
    }
  }

  const [stamp] = await query<{ last_checked: string | null }>(
    `SELECT MAX(created_at) AS last_checked FROM triage_decisions`,
  );

  return {
    reviewed,
    surfaced,
    filtered: reviewed - surfaced,
    lastCheckedUtc: stamp?.last_checked ?? null,
    topics: TAGS.map((t) => ({
      id: t.id,
      label: t.label,
      read: read.get(t.id) ?? 0,
      forYou: forYou.get(t.id) ?? 0,
    })),
  };
}

/** Three levels, per the design: urgent, worth knowing, logged. */
export type Severity = "urgent" | "worth-knowing" | "logged";

export type SurfacedItem = {
  decisionId: string;
  title: string;
  source: string;
  sourceLabel: string;
  decision: "ALERT" | "OPPORTUNITY";
  reason: string;
  tags: string[];
  createdAtUtc: string;
  severity: Severity;
  /** FDA recall class when the source provides one; null on fda_rss. */
  classification: string | null;
  /** Council hearing / permit issue date, when the payload carries one. */
  timingLabel: string | null;
  /**
   * Rendered on the server. Computing this in the client component instead
   * would make SSR and hydration disagree the moment the clock ticks.
   */
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
 * probability of serious harm" tier, so it maps to urgent. Everything without
 * a classification stays at "worth knowing" rather than being guessed at from
 * the reason prose, which would be fabrication.
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

export async function getSurfaced(limit = 50): Promise<SurfacedItem[]> {
  const rows = await query<{
    decision_id: string;
    title: string;
    source: string;
    decision: "ALERT" | "OPPORTUNITY";
    reason: string;
    tags: unknown;
    created_at: string;
    payload: unknown;
  }>(
    `SELECT d.id AS decision_id, doc.title, doc.source, d.decision, d.reason,
            d.tags, d.created_at, doc.payload
       FROM triage_decisions d
       JOIN documents doc ON doc.id = d.document_id
      WHERE d.decision IN ('ALERT','OPPORTUNITY')
      ORDER BY d.created_at DESC
      LIMIT ?`,
    [limit],
  );

  return rows.map((r) => {
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
      decisionId: String(r.decision_id),
      title: r.title,
      source: r.source,
      sourceLabel: SOURCE_LABEL[r.source] ?? r.source,
      decision: r.decision,
      reason: r.reason,
      tags: parseTags(r.tags),
      createdAtUtc: r.created_at,
      severity: severityOf(classification, r.decision),
      classification,
      timingLabel,
      postedLabel: posted(r.created_at),
    };
  });
}

export type Permit = {
  documentId: string;
  title: string;
  lat: number;
  lon: number;
  status: string | null;
  distanceM: number | null;
  decision: string;
};

/** Store anchor, per the data contract. */
export const STORE_ANCHOR = { lat: 37.3085, lon: -121.8995 };

export async function getNearbyPermits(): Promise<Permit[]> {
  const rows = await query<{
    document_id: string;
    title: string;
    lat: string | null;
    lon: string | null;
    status: string | null;
    distance_from_store_m: string | null;
    decision: string;
  }>(`SELECT document_id, title, lat, lon, status, distance_from_store_m, decision
        FROM v_nearby_permits`);

  return rows
    .map((r) => ({
      documentId: String(r.document_id),
      title: r.title,
      lat: parseFloat(r.lat ?? ""),
      lon: parseFloat(r.lon ?? ""),
      status: r.status,
      distanceM: r.distance_from_store_m === null ? null : parseFloat(r.distance_from_store_m),
      decision: r.decision,
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

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
