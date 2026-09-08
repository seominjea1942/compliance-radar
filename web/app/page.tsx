import Link from "next/link";
import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { AskRadarDock } from "@/components/ask/AskRadarDock";
import { Header } from "@/components/Header";
import { LogRows } from "@/components/log/LogRows";
import { SurfacedCard } from "@/components/SurfacedCard";
import { TopicFilter } from "@/components/TopicFilter";
import { ContextRail } from "@/components/rail/ContextRail";
import { DecisionTabs } from "@/components/ui/decision-tabs";
import { PageTitle } from "@/components/ui/page-title";
import { count } from "@/lib/format";
import {
  getFilteredLog,
  getStoreProfile,
  getSurfaced,
  getWeeklySummary,
  groupSurfaced,
  TAGS,
  type Severity,
  type SurfacedEvent,
} from "@/lib/queries";
import { hrefFor, isLogView, logStatusFor, PAGE, readParams, type View } from "@/lib/view";

// Live operational data: never serve a build-time snapshot.
export const dynamic = "force-dynamic";

/** Which display tiers each surfaced view admits. */
const TIER: Record<"act" | "check" | "file", (s: Severity) => boolean> = {
  act: (s) => s === "act",
  check: (s) => s === "priority-verify" || s === "verify",
  file: (s) => s === "fyi",
};

/**
 * The headline answers the question the selected view asks, so it changes
 * with the control rather than always reporting on whether anything needs
 * action.
 *
 * None of these say "this week". The views list open obligations with no time
 * bound; the weekly claim belongs to the line below, which really is a
 * statistic about the week.
 */
const HEADING: Record<View, (n: number) => string> = {
  act: (n) =>
    n === 0
      ? "Nothing needs action."
      : `${count(n)} ${n === 1 ? "thing needs" : "things need"} action.`,
  check: (n) => (n === 0 ? "Nothing to check." : `${count(n)} ${n === 1 ? "item" : "items"} to check.`),
  file: (n) =>
    n === 0 ? "Nothing for the file." : `${count(n)} ${n === 1 ? "item" : "items"} for the file.`,
  "set-aside": () => "Everything I've read",
  overturned: () => "Everything I've read",
  all: () => "Everything I've read",
};

const SUBHEAD: Record<View, string> = {
  act: "",
  check: "",
  file: "",
  "set-aside":
    "Set aside holds what I chose not to surface, each with a reason. If I set something aside wrongly, say so and I'll adjust.",
  overturned: "The calls you sent back. I watch these differently from now on.",
  all: "Everything I decided: what I surfaced, and what I set aside with a reason.",
};

/** An event's topics are the union of its items': a group can span two. */
function topicsOf(e: SurfacedEvent): string[] {
  return [...new Set(e.items.flatMap((i) => i.tags))];
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = readParams(await searchParams);
  const { view, tag, limit } = params;

  const [summary, surfaced, profile, log] = await Promise.all([
    getWeeklySummary(),
    getSurfaced(),
    getStoreProfile(),
    // Always: the control needs the set-aside counts on every view. On a
    // surfaced view one row is enough, and the totals come back regardless.
    getFilteredLog({
      status: logStatusFor(view),
      tag,
      limit: isLogView(view) ? limit : 1,
    }),
  ]);

  // One card per real-world recall event, grouped on the backend's event_key.
  const events = groupSurfaced(surfaced);
  const inTopic = tag ? events.filter((e) => topicsOf(e).includes(tag)) : events;

  const counts = {
    act: events.filter((e) => TIER.act(e.severity)).length,
    check: events.filter((e) => TIER.check(e.severity)).length,
    file: events.filter((e) => TIER.file(e.severity)).length,
    "set-aside": log.overall.setAside,
    overturned: log.overall.overturned,
    // Everything the radar decided: what it surfaced, plus what it did not.
    all: events.length + log.overall.all,
  };

  // Per topic, within the view on screen, so a dead option can say so.
  const topicCounts = Object.fromEntries(
    TAGS.map((t) => [
      t.id,
      isLogView(view)
        ? 0
        : events.filter((e) => TIER[view](e.severity) && topicsOf(e).includes(t.id)).length,
    ]),
  );

  /*
   * The All view is the only place both halves appear together. The surfaced
   * cards go above the rows rather than interleaved: they are 28 against 578,
   * and the rows are paged, so any shared ordering would bury them on the
   * first page and lose them on the second.
   */
  const cards = view === "all" ? inTopic : isLogView(view) ? [] : inTopic.filter((e) => TIER[view](e.severity));
  const onScreen = cards.length + (isLogView(view) ? log.counts[view === "overturned" ? "overturned" : view === "all" ? "all" : "setAside"] : 0);
  const shown = cards.length + log.rows.length * (isLogView(view) ? 1 : 0);

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col bg-shell">
        <Header profile={profile} />

        {/* The bar spans the window above this row; the rail and the panel
            are columns of it, so one header covers all three. */}
        <div className="flex min-h-0 flex-1">
          {/* Rail and content share a row inside the one holding the panel:
              the panel carries no order, so as their sibling it sorted ahead
              of both at every width. */}
          <div className="flex min-w-0 flex-1 flex-col xl:flex-row">
            <ContextRail />

            <main className="order-1 min-w-0 flex-1 bg-paper xl:order-2">
              <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 pt-5 pb-10 md:px-12 md:pt-7.5 md:pb-12">
                <div className="flex flex-col gap-1.5">
                  <PageTitle>{HEADING[view](counts[view])}</PageTitle>
                  <p className="max-w-[700px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
                    {SUBHEAD[view] || `${count(summary.reviewed)} items read this week.`}
                  </p>
                </div>

                {/* State on the left, topic behind the button on the right. */}
                <div className="flex items-center gap-2">
                  {/*
                    min-w-0 without flex-1: the strip takes the width its items
                    need and shrinks below that only when the row runs out. With
                    flex-1 it stretched to fill, leaving 51px of empty pill to
                    the right of the last item at a wide window.
                  */}
                  <DecisionTabs params={params} counts={counts} className="min-w-0" />
                  {/* Pushed to the far edge: it is the other axis, not the
                      seventh item of the control it sits beside. */}
                  <div className="ml-auto flex-none">
                    <TopicFilter params={params} counts={topicCounts} />
                  </div>
                </div>

                {/*
                  The count that answers the filters. Live-region so a screen
                  reader hears the new total after a filter changes, which is
                  the one place a number on this screen should move at all.
                */}
                {/* text-muted, not text-faint: this line sits on the grey column
                    rather than on a card, where #71717a measures 4.4:1. */}
                <p aria-live="polite" className="m-0 -mt-2 text-[12.5px]/relaxed text-muted">
                  <span className="font-mono tabular-nums text-ink">{count(onScreen)}</span>{" "}
                  {isLogView(view) ? "decisions" : "open"}
                  {tag
                    ? ` in ${TAGS.find((t) => t.id === tag)?.label.toLowerCase()}`
                    : " across every topic"}
                  {shown < onScreen && `, showing ${count(shown)}`}.
                </p>

                {cards.length > 0 && (
                  <div className="flex flex-col gap-3.5">
                    {cards.map((e) => (
                      <SurfacedCard key={e.key} event={e} />
                    ))}
                  </div>
                )}

                {isLogView(view) && <LogRows rows={log.rows} />}

                {cards.length === 0 && !isLogView(view) && (
                  <p className="py-6 text-center text-[14px] text-faint">Nothing in this group.</p>
                )}

                {isLogView(view) && log.hasMore && (
                  <div className="flex items-center justify-center text-[12.5px]">
                    <Link
                      href={hrefFor({ limit: limit + PAGE }, params)}
                      className="font-medium text-brand no-underline hover:underline"
                    >
                      Load more
                    </Link>
                  </div>
                )}
              </div>
            </main>
          </div>

          <AskRadarDock />
        </div>
      </div>
    </AskRadarProvider>
  );
}
