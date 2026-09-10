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
import {
  hrefFor,
  isHandledView,
  isLogView,
  logStatusFor,
  PAGE,
  readParams,
  spanDays,
  type View,
} from "@/lib/view";

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
  handled: (n) =>
    n === 0 ? "Nothing handled yet." : `${count(n)} ${n === 1 ? "item" : "items"} you closed.`,
  "set-aside": () => "Everything I've read",
  overturned: () => "Everything I've read",
  all: () => "Everything I've read",
};

const SUBHEAD: Record<View, string> = {
  act: "",
  check: "",
  file: "",
  handled:
    "Things I surfaced and you dealt with. They leave the feed when you close them; they do not leave the record.",
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
  const { view, tag, q, span, limit } = params;
  // One window for every number on this screen.
  const days = spanDays(span);

  const [summary, surfaced, profile, range, log] = await Promise.all([
    getWeeklySummary(days),
    getSurfaced(days),
    getStoreProfile(),
    // Always: the control needs the set-aside counts on every view. On a
    // surfaced view one row is enough, and the totals come back regardless.
    getDataRange(),
    getFilteredLog({
      status: logStatusFor(view),
      tag,
      // Search belongs to the log half only; a surfaced view keeps its counts.
      q: isLogView(view) ? q : null,
      days,
      limit: isLogView(view) ? limit : 1,
    }),
  ]);

  // One card per real-world recall event, grouped on the backend's event_key.
  const events = groupSurfaced(surfaced, isHandledView(view) ? "resolved" : "open");
  const inTopic = tag ? events.filter((e) => topicsOf(e).includes(tag)) : events;

  /*
   * Tab counts are card counts, so they hold whatever the view is showing. The
   * open tiers are counted off the open grouping; handled has to be grouped
   * separately, because `events` is whichever side the current view asked for.
   */
  const openEvents = isHandledView(view) ? groupSurfaced(surfaced, "open") : events;
  const handledEvents = isHandledView(view) ? events : groupSurfaced(surfaced, "resolved");

  const counts = {
    act: openEvents.filter((e) => TIER.act(e.severity)).length,
    check: openEvents.filter((e) => TIER.check(e.severity)).length,
    file: openEvents.filter((e) => TIER.file(e.severity)).length,
    handled: handledEvents.length,
    "set-aside": log.overall.setAside,
    overturned: log.overall.overturned,
    /*
     * Everything the radar decided, counted in decisions on both sides.
     *
     * It used to add surfaced *cards* to log *rows*, which came out 688
     * against the 715 the same screen reported as read and as total flagged.
     * The All view still lists 29 cards over 659 rows -- grouping is why --
     * and the line under the tabs says so: "715 decisions, showing 25".
     */
    all: surfaced.length + log.overall.all,
  };

  /*
   * The read/sorted line counts decisions, not cards.
   *
   * `counts.act + check + file` counts event cards, and a card can be five
   * decisions: Straus's five flavours are one. Adding those to the log's row
   * counts produced a total 27 short of what the radar actually read, and two
   * different totals on one screen -- this line said 688 where the topic
   * ledger beside it said 715.
   *
   * `reviewed` is the decision count from the same view the ledger sums, so
   * the two agree, and what was surfaced is what is left after the set-aside.
   */
  /*
   * What the headline's line says: how much was read, and how little of it
   * reached the owner.
   *
   * `read` counts decisions and `brought to you` counts cards, which are
   * different units on purpose. A card is one thing to deal with however many
   * product rows sit inside it -- Straus is five -- so cards are what the
   * reader can actually count on the screen, and they match the tabs
   * underneath. Counting rows here instead made the line disagree with the
   * tabs; counting cards on both sides would understate what was read.
   */
  const readTotal = summary.reviewed;
  const surfacedCards = counts.act + counts.check + counts.file;

  // Per topic, within the view on screen, so a dead option can say so.
  const topicCounts = Object.fromEntries(
    TAGS.map((t) => [
      t.id,
      isLogView(view)
        ? 0
        : isHandledView(view)
          ? events.filter((e) => topicsOf(e).includes(t.id)).length
          : events.filter((e) => TIER[view](e.severity) && topicsOf(e).includes(t.id)).length,
    ]),
  );

  /*
   * The All view is the only place both halves appear together. The surfaced
   * cards go above the rows rather than interleaved: they are 28 against 578,
   * and the rows are paged, so any shared ordering would bury them on the
   * first page and lose them on the second.
   */
  const cards =
    view === "all"
      ? inTopic
      : isLogView(view)
        ? []
        : // Handled is not a tier, it is the whole closed side.
          isHandledView(view)
          ? inTopic
          : inTopic.filter((e) => TIER[view](e.severity));
  /*
   * The count above the list. On All it is the decision total, matching the
   * tab, not the number of things drawn: `shown` below reports that.
   */
  const onScreen =
    view === "all"
      ? counts.all
      : cards.length +
        (isLogView(view)
          ? log.counts[view === "overturned" ? "overturned" : "setAside"]
          : 0);
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
                  {range && (
                    <DataRange
                      params={params}
                      fullLabel={rangeLabel(range.from, range.to)}
                    />
                  )}
                  <PageTitle className="max-w-[620px]">{HEADING[view](counts[view])}</PageTitle>
                  <p className="max-w-[520px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
                    {SUBHEAD[view] || (
                      <>
                        {/*
                          What it read in the span above, and what it did with
                          it. "Items read this week" answered neither: it was a
                          bare total, and a 7-day one under a masthead whose
                          date range covers everything, so the two numbers on
                          screen were counting different windows.
                        */}
                        {/*
                          Two numbers, not five. The line is the product's
                          whole argument -- it reads a great deal and
                          interrupts rarely -- and a five-part breakdown made
                          the reader do arithmetic instead of hearing it. What
                          was set aside is the difference between these, the
                          tabs below count what is waiting, and the handled
                          archive has its own entry there.
                        */}
                        {count(readTotal)} read
                        {" · "}
                        {count(surfacedCards)} brought to you
                      </>
                    )}
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
                {/*
                  Same treatment as the rail's section names, because that is
                  what it is: the label for the list under it. Its rule is the
                  one that opens the list, so the first item does not draw its
                  own on top of it.
                */}
                <p
                  aria-live="polite"
                  className="m-0 mt-2 border-b-2 border-rule pb-1.5 font-mono text-[11px] font-medium tracking-[0.16em] text-ink uppercase"
                >
                  <span className="tabular-nums">{count(onScreen)}</span>{" "}
                  {isLogView(view)
                    ? onScreen === 1
                      ? "decision"
                      : "decisions"
                    : isHandledView(view)
                      ? "closed"
                      : "open"}
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

                  <ContextRail days={days} className="flex flex-col gap-10 lg:w-[300px] lg:flex-none" />
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
