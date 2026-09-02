/**
 * INTERIM QUERIES — DELETE THIS FILE WHEN THE VIEWS LAND.
 *
 * The contract says to request a view rather than invent a query. Two home
 * screen elements have no view behind them, and both are requested from the
 * backend session:
 *
 *   1. `v_weekly_topics` — the "Topic / Read / For you" table. v_weekly_summary
 *      is per *source*; this table is per *tag*. Wanted shape, 7-day rolling:
 *        tag (str), read (int), for_you (int)   -- one row per tag, zeros kept
 *
 *   2. `last_checked` — the "Checked today, 6:02 AM" trust stamp. Either a
 *      column on v_weekly_summary or a one-row v_run_status view:
 *        last_checked (datetime)  -- MAX(created_at) over triage_decisions
 *
 * Until then these two functions keep the screen whole. They are the only
 * bespoke SQL in the app; everything else reads a view. When the views exist,
 * delete this file and point the two call sites at `SELECT * FROM v_...`.
 */
import { query } from "./db";
import { TAGS, WINDOW_DAYS, parseTags } from "./queries";

export type TopicRow = { id: string; label: string; read: number; forYou: number };

/** Replace with: SELECT * FROM v_weekly_topics */
export async function getWeeklyTopics(): Promise<TopicRow[]> {
  const rows = await query<{ tags: unknown; decision: string; n: number | string }>(
    `SELECT tags, decision, COUNT(*) AS n
       FROM triage_decisions
      WHERE created_at >= NOW() - INTERVAL ? DAY
      GROUP BY tags, decision`,
    [WINDOW_DAYS],
  );

  const read = new Map<string, number>();
  const forYou = new Map<string, number>();

  for (const r of rows) {
    const n = Number(r.n);
    const surfaced = r.decision === "ALERT" || r.decision === "OPPORTUNITY";
    for (const t of parseTags(r.tags)) {
      read.set(t, (read.get(t) ?? 0) + n);
      if (surfaced) forYou.set(t, (forYou.get(t) ?? 0) + n);
    }
  }

  // Every tag is rendered, including the ones with nothing this week: the
  // empty rows are the product thesis, not missing data (contract rec 4).
  return TAGS.map((t) => ({
    id: t.id,
    label: t.label,
    read: read.get(t.id) ?? 0,
    forYou: forYou.get(t.id) ?? 0,
  }));
}

/** Replace with: SELECT last_checked FROM v_run_status */
export async function getLastChecked(): Promise<string | null> {
  const [row] = await query<{ last_checked: string | null }>(
    `SELECT MAX(created_at) AS last_checked FROM triage_decisions`,
  );
  return row?.last_checked ?? null;
}
