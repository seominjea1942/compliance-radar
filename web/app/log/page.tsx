import Link from "next/link";
import { MdClose } from "react-icons/md";
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
  type SourceGroup,
} from "@/lib/queries";
import { count } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUSES: { value: LogStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "resolved", label: "Resolved" },
  { value: "filtered", label: "Filtered" },
];

const SOURCES: { value: SourceGroup | "all"; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "recalls", label: "Recalls" },
  { value: "council", label: "Council" },
  { value: "permits", label: "Permits" },
];

const PAGE = 25;

/**
 * Filters live in the URL rather than component state: the server does the
 * filtering and paging, so a filtered view is shareable and "load more" does
 * not ship 512 rows to the browser to hide most of them.
 */
function hrefFor(params: {
  status: LogStatus;
  source: SourceGroup | "all";
  limit: number;
  tag: string | null;
}) {
  const q = new URLSearchParams();
  if (params.status !== "filtered") q.set("status", params.status);
  if (params.source !== "all") q.set("source", params.source);
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

  const status = (STATUSES.find((s) => s.value === one("status"))?.value ?? "filtered") as LogStatus;
  const source = (SOURCES.find((s) => s.value === one("source"))?.value ?? "all") as
    | SourceGroup
    | "all";
  const limit = Math.min(Math.max(Number(one("limit")) || PAGE, PAGE), 500);
  // Validated against the fixed tag set: an unknown ?tag is dropped rather
  // than narrowing the log to nothing and looking like an empty database.
  const topic = TAGS.find((t) => t.id === one("tag")) ?? null;

  const [log, summary, profile] = await Promise.all([
    getFilteredLog({ status, source, tag: topic?.id ?? null, limit }),
    getWeeklySummary(),
    getStoreProfile(),
  ]);

  const tabCount: Record<LogStatus, number> = {
    all: log.counts.all,
    resolved: log.counts.resolved,
    filtered: log.counts.filtered,
  };

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col bg-shell md:flex-row">
        <Sidebar
          profile={profile}
          surfacedCount={summary.surfaced}
          filteredCount={log.overall.filtered}
          current="log"
        />

        <main className="min-w-0 flex-1 bg-paper">
          <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 pt-5 pb-10 md:gap-6.5 md:px-12 md:pt-7.5 md:pb-12">
            <Card className="gap-5">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[20px]/tight font-semibold tracking-[-0.01em] text-ink md:text-[23px]">
                  Everything I&apos;ve read
                </h1>
                <p className="max-w-[700px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
                  {count(log.counts.all)} items. Filtered holds what I chose not to surface, each
                  with a reason. Resolved holds what you brought to a close. If I filtered
                  something wrongly, flip it and I&apos;ll adjust.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 rounded-full border border-line bg-rail p-1 self-start">
                {STATUSES.map((s) => (
                  <Link
                    key={s.value}
                    href={hrefFor({ status: s.value, source, limit: PAGE, tag: topic?.id ?? null })}
                    aria-current={s.value === status ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium no-underline transition-colors",
                      s.value === status
                        ? "bg-paper text-ink shadow-[0_1px_2px_rgba(24,24,27,0.06)]"
                        : "text-muted hover:bg-hover hover:text-ink",
                    )}
                  >
                    {s.label}
                    <span className="font-mono text-[11px] tabular-nums text-faint">
                      {count(tabCount[s.value])}
                    </span>
                  </Link>
                ))}
              </div>

              {topic && (
                <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
                  <span className="text-[12.5px] text-faint">Topic</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-shell py-1 pr-1 pl-3 text-[12.5px] font-medium text-ink">
                    {topic.label}
                    {/*
                      Arriving here from the overview means the filter was
                      applied by a click elsewhere, so it has to be visible and
                      removable from this screen. Without it a topic with no
                      log rows just looks like a broken page.
                    */}
                    <Link
                      href={hrefFor({ status, source, limit: PAGE, tag: null })}
                      aria-label={`Clear the ${topic.label} topic filter`}
                      className="flex size-5 items-center justify-center rounded-full text-faint no-underline transition-colors hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <MdClose className="size-3.5" aria-hidden />
                    </Link>
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
                {SOURCES.map((s) => (
                  <Link
                    key={s.value}
                    href={hrefFor({ status, source: s.value, limit: PAGE, tag: topic?.id ?? null })}
                    aria-current={s.value === source ? "true" : undefined}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[12.5px] no-underline transition-colors",
                      s.value === source
                        ? "border-line-strong bg-shell font-medium text-ink"
                        : "border-line text-muted hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>

              <LogRows rows={log.rows} />

              <div className="flex items-center justify-center gap-2 text-[12.5px] text-faint">
                <span>
                  Showing {count(log.rows.length)} of {count(tabCount[status])}
                </span>
                {log.hasMore && (
                  <Link
                    href={hrefFor({ status, source, limit: limit + PAGE, tag: topic?.id ?? null })}
                    className="font-medium text-green no-underline hover:underline"
                  >
                    Load more
                  </Link>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </AskRadarProvider>
  );
}
