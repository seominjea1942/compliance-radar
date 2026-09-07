import Link from "next/link";
import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { LogRows } from "@/components/log/LogRows";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getFilteredLog,
  getStoreProfile,
  getWeeklySummary,
  TAGS,
  type LogStatus,
} from "@/lib/queries";
import { count } from "@/lib/format";
import { segmented } from "@/components/ui/segmented";

export const dynamic = "force-dynamic";

/**
 * The two states, then their union.
 *
 * "Overturned" replaces "Resolved", which named the wrong thing entirely:
 * the Resolve flow writes `resolution` on surfaced items and never lands in
 * the log. "Set aside" replaces "Filtered", which shared a word with the
 * topic filters sitting directly beneath it, so the state a row was in and
 * the control that narrowed the list read as the same idea.
 */
const STATUSES: { value: LogStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "set-aside", label: "Set aside" },
  { value: "overturned", label: "Overturned" },
];

/**
 * The log filters by topic, matching the overview's table exactly, so a row
 * there and a pill here mean the same thing.
 *
 * This replaced a source-group row (Recalls / Council / Permits). Those were
 * nearly the same idea from the other end - Recalls held precisely the 346
 * food-recall rows, Permits 73 of the 74 nearby-construction ones - but
 * Council alone spanned three topics, so a topic could not simply select a
 * source pill without two different topics landing on one page.
 */
const TOPICS: { value: string | null; label: string }[] = [
  { value: null, label: "All topics" },
  ...TAGS.map((t) => ({ value: t.id as string | null, label: t.label })),
];

/** What the scoped indicator is counting, per status tab. */
const STATUS_NOUN: Record<LogStatus, string> = {
  all: "items read",
  "set-aside": "set aside, not surfaced",
  overturned: "overturned",
};

const PAGE = 25;

/**
 * Filters live in the URL rather than component state: the server does the
 * filtering and paging, so a filtered view is shareable and "load more" does
 * not ship 512 rows to the browser to hide most of them.
 */
function hrefFor(params: { status: LogStatus; limit: number; tag: string | null }) {
  const q = new URLSearchParams();
  if (params.status !== "set-aside") q.set("status", params.status);
  if (params.tag) q.set("tag", params.tag);
  if (params.limit !== PAGE) q.set("limit", String(params.limit));
  const s = q.toString();
  return s ? `/log?${s}` : "/log";
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);

  const status = (STATUSES.find((s) => s.value === one("status"))?.value ?? "set-aside") as LogStatus;
  const limit = Math.min(Math.max(Number(one("limit")) || PAGE, PAGE), 500);
  // Validated against the fixed tag set: an unknown ?tag is dropped rather
  // than narrowing the log to nothing and looking like an empty database.
  const topic = TAGS.find((t) => t.id === one("tag")) ?? null;

  const [log, summary, profile] = await Promise.all([
    getFilteredLog({ status, tag: topic?.id ?? null, limit }),
    getWeeklySummary(),
    getStoreProfile(),
  ]);

  /*
   * Two different questions, two different numbers.
   *
   * The tabs are navigation: each one says how big that part of the log is,
   * full stop. Scoping them to the selected topic made them report the view
   * being left rather than the one being entered, so All could read 1 while
   * the page said 578 items just above it.
   *
   * The line under the pills is the opposite: it exists to answer the
   * filters, so it stays scoped to the topic and the tab in force.
   */
  const tabCount: Record<LogStatus, number> = {
    all: log.overall.all,
    "set-aside": log.overall.setAside,
    overturned: log.overall.overturned,
  };

  const scopedCount: Record<LogStatus, number> = {
    all: log.counts.all,
    "set-aside": log.counts.setAside,
    overturned: log.counts.overturned,
  };

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          profile={profile}
          surfacedCount={summary.surfaced}
          setAsideCount={log.overall.setAside}
          current="log"
        />

        <main className="min-w-0 flex-1">
          <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 pt-5 pb-10 md:gap-6.5 md:px-12 md:pt-7.5 md:pb-12">
            <Card className="gap-5">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[20px]/tight font-semibold tracking-[-0.01em] text-ink md:text-[23px]">
                  Everything I&apos;ve read
                </h1>
                {/*
                  The whole log, not the current slice. This sentence describes
                  what the page is; a number that moved every time a pill was
                  pressed was reporting the filter instead, and read as though
                  the archive itself had shrunk. The filtered figures live with
                  the filters, below.
                */}
                <p className="max-w-[700px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
                  {count(log.overall.all)} items. Set aside holds what I chose not to surface,
                  each with a reason. Overturned holds the calls you sent back. If I set
                  something aside wrongly, say so and I&apos;ll adjust.
                </p>
              </div>

              {/* Links, not buttons: the filters live in the URL. Same
                  appearance as FilterPills, from the same class strings. */}
              <div className={cn(segmented.track, "self-start")}>
                {STATUSES.map((s) => {
                  const active = s.value === status;
                  return (
                    <Link
                      key={s.value}
                      href={hrefFor({ status: s.value, limit: PAGE, tag: topic?.id ?? null })}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        segmented.item,
                        "no-underline",
                        active ? segmented.active : segmented.idle,
                      )}
                    >
                      {s.label}
                      <span
                        className={cn(
                          "font-mono text-[11px] tabular-nums",
                          active ? segmented.countActive : segmented.countIdle,
                        )}
                      >
                        {count(tabCount[s.value])}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-line-soft pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {TOPICS.map((t) => {
                    const active = t.value === (topic?.id ?? null);
                    return (
                      <Link
                        key={t.value ?? "all"}
                        href={hrefFor({ status, limit: PAGE, tag: t.value })}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "rounded-full border px-3 py-1 text-[12.5px] no-underline transition-colors",
                          active
                            ? "border-line-strong bg-shell font-medium text-ink"
                            : "border-line text-muted hover:border-line-strong hover:text-ink",
                        )}
                      >
                        {t.label}
                      </Link>
                    );
                  })}
                </div>

                {/*
                  The count that answers the filters, kept with them. It is
                  live-region so a screen reader hears the new total after a
                  pill is pressed, which is the one place the number should
                  move at all.
                */}
                <p
                  aria-live="polite"
                  className="m-0 text-[12.5px]/relaxed text-faint"
                >
                  <span className="font-mono tabular-nums text-monoink">
                    {count(scopedCount[status])}
                  </span>{" "}
                  {STATUS_NOUN[status]}
                  {topic ? ` in ${topic.label.toLowerCase()}` : " across every topic"}
                  {log.rows.length < scopedCount[status] &&
                    `, showing ${count(log.rows.length)}`}
                  .
                </p>
              </div>

              <LogRows rows={log.rows} />

              {log.hasMore && (
                <div className="flex items-center justify-center text-[12.5px]">
                  <Link
                    href={hrefFor({ status, limit: limit + PAGE, tag: topic?.id ?? null })}
                    className="font-medium text-green no-underline hover:underline"
                  >
                    Load more
                  </Link>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </AskRadarProvider>
  );
}
