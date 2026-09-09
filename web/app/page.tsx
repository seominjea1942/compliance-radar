import Link from "next/link";
import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { AskRadarDock } from "@/components/ask/AskRadarDock";
import { Header } from "@/components/Header";
import { LogRows } from "@/components/log/LogRows";
import { SurfacedCard } from "@/components/SurfacedCard";
import { TopicFilter } from "@/components/TopicFilter";
import { LogSearch } from "@/components/LogSearch";
import { ContextRail } from "@/components/rail/ContextRail";
import { DataRange } from "@/components/DataRange";
import { DecisionTabs } from "@/components/ui/decision-tabs";
import { PageTitle } from "@/components/ui/page-title";
import { count, rangeLabel } from "@/lib/format";
import {
  getDataRange,
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
  /*
   * "A human signature", not "action": the claim of the product is that a
   * person, not the filter, is the one who decides. The zero state stays in
   * the same vocabulary, because that sentence is the thesis, not a fallback.
   */
  act: (n) =>
    n === 0
      ? "Nothing needs your signature."
      : `${count(n)} ${n === 1 ? "item requires" : "items require"} a human signature.`,
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
  const { view, tag, q, limit } = params;

  const [summary, surfaced, profile, range, log] = await Promise.all([
    getWeeklySummary(),
    getSurfaced(),
    getStoreProfile(),
    // Always: the control needs the set-aside counts on every view. On a
    // surfaced view one row is enough, and the totals come back regardless.
    getDataRange(),
    getFilteredLog({
      status: logStatusFor(view),
      tag,
      // Search belongs to the log half only; a surfaced view keeps its counts.
      q: isLogView(view) ? q : null,
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
      <div className="flex min-h-screen flex-col bg-ground">
        <Header profile={profile} />

        {/* The bar spans the window above this row; the rail and the panel
            are columns of it, so one header covers all three. */}
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="min-w-0 flex-1 bg-paper">
              <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-9 px-4 pt-5 pb-10 md:px-12 md:pt-7.5 md:pb-12">
                {/*
                  The masthead. Centred and held to a measure well inside the
                  column: at the container's full 1180px the sentence ran as
                  one long line and stopped reading as a headline. Two lines
                  is the shape, so the width is set to force it rather than
                  left to whatever the viewport happens to allow.

                  The dotted rule stays on this wrapper, so it spans the whole
                  column while the words stay narrow, the way a masthead rule
                  runs wider than the title above it.
                */}
                <div className="flex flex-col items-center gap-3.5 border-b border-dotted border-line-strong pt-4 pb-10 text-center md:pt-8 md:pb-12">
                  {range && <DataRange label={rangeLabel(range.from, range.to)} />}
                  <PageTitle className="max-w-[620px]">{HEADING[view](counts[view])}</PageTitle>
                  <p className="max-w-[520px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
                    {SUBHEAD[view] || `${count(summary.reviewed)} items read this week.`}
                  </p>
                </div>

                {/*
                  Feed and context share one row under the masthead. The rail
                  is no longer a fixed column of the window: it scrolls with
                  the page, on the reading side rather than opposite it, so
                  the headline can run the full width above both.
                */}
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
                  <div className="flex min-w-0 flex-1 flex-col gap-5">

                {/*
                  Wraps rather than squeezes. The search box only exists on the
                  log views, so this row grows by ~200px exactly when it is
                  already at its widest; without wrapping, the loss came out of
                  the segmented control, which clipped its last item to a black
                  sliver at the very moment that item was the selected one.
                */}
                <div className="flex flex-wrap items-center gap-2">
                  {/*
                    min-w-0 without flex-1: the strip takes the width its items
                    need and shrinks below that only when the row runs out. With
                    flex-1 it stretched to fill, leaving 51px of empty pill to
                    the right of the last item at a wide window.
                  */}
                  <DecisionTabs params={params} counts={counts} className="max-w-full" />
                  {/* Pushed to the far edge: it is the other axis, not the
                      seventh item of the control it sits beside. */}
                  <div className="ml-auto flex flex-none items-center gap-2">
                    {/*
                      Search is hidden while the control row is being designed.
                      Only the trigger is gone: `?q=` still filters on the
                      server, so a prepared URL reaches the same screen and
                      putting the box back is this one line.
                    */}
                    {false && isLogView(view) && <LogSearch params={params} />}
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
                  {isLogView(view) ? (onScreen === 1 ? "decision" : "decisions") : "open"}
                  {tag
                    ? ` in ${TAGS.find((t) => t.id === tag)?.label.toLowerCase()}`
                    : " across every topic"}
                  {isLogView(view) && q ? ` matching “${q}”` : ""}
                  {shown < onScreen && `, showing ${count(shown)}`}.
                </p>

                {cards.length > 0 && (
                  <div className="flex flex-col">
                    {/* No gap: each item draws its own rule, and a gap on top
                        of that would space the rules unevenly against the
                        padding inside them. */}
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

                  <ContextRail className="flex flex-col gap-10 lg:w-[300px] lg:flex-none" />
                </div>
              </div>
            </main>
          </div>

          <AskRadarDock />
        </div>
      </div>
    </AskRadarProvider>
  );
}
