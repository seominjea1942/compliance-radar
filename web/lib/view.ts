import { TAGS, type LogStatus } from "@/lib/queries";

/**
 * Every state a decision can be in, as one list.
 *
 * Three are things the radar surfaced, ranked by what they ask of the owner;
 * two are things it did not, split by whether that call still stands; the
 * last is the union of all five. There is one screen now, so these are views
 * of it rather than routes.
 */
export const VIEWS = ["act", "check", "file", "set-aside", "overturned", "all"] as const;
export type View = (typeof VIEWS)[number];

/** The three that read from v_surfaced_feed rather than the log. */
export const SURFACED_VIEWS = ["act", "check", "file"] as const;

export function isLogView(v: View): v is "set-aside" | "overturned" | "all" {
  return v === "set-aside" || v === "overturned" || v === "all";
}

/** The log query's own vocabulary. "all" carries the surfaced half too. */
export function logStatusFor(v: View): LogStatus {
  return v === "overturned" ? "overturned" : v === "all" ? "all" : "set-aside";
}

export const PAGE = 25;

export type ViewParams = { view: View; tag: string | null; limit: number };

/**
 * Filters live in the URL: the set-aside half is 577 rows served 25 at a
 * time, so the server does the filtering and the paging, and a filtered
 * screen is a link you can send someone.
 */
export function hrefFor(p: Partial<ViewParams>, from: ViewParams): string {
  // Spreading the patch directly would let an explicit `undefined` overwrite
  // a real value and then serialise as the string "undefined"; changing the
  // view or the topic has to reset the page, which is what that was for.
  const next: ViewParams = {
    view: p.view ?? from.view,
    tag: p.tag !== undefined ? p.tag : from.tag,
    limit: p.limit ?? from.limit,
  };
  const q = new URLSearchParams();
  if (next.view !== "act") q.set("view", next.view);
  if (next.tag) q.set("tag", next.tag);
  if (next.limit !== PAGE) q.set("limit", String(next.limit));
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

export function readParams(sp: Record<string, string | string[] | undefined>): ViewParams {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  return {
    view: (VIEWS as readonly string[]).includes(one("view") ?? "")
      ? (one("view") as View)
      : "act",
    // Validated against the fixed tag set: an unknown ?tag is dropped rather
    // than narrowing the screen to nothing and looking like an empty database.
    tag: TAGS.find((t) => t.id === one("tag"))?.id ?? null,
    limit: Math.min(Math.max(Number(one("limit")) || PAGE, PAGE), 500),
  };
}
