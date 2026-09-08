import { DecisionTabs, type DecisionTab, type TabCounts } from "@/components/ui/decision-tabs";
import { SurfacedCard } from "@/components/SurfacedCard";
import { PageTitle } from "@/components/ui/page-title";
import { count } from "@/lib/format";
import type { Severity, SurfacedEvent } from "@/lib/queries";

type Filter = "act" | "check" | "file" | "all";

/** Which display tiers each filter admits. */
const MATCHES: Record<Filter, (s: Severity) => boolean> = {
  act: (s) => s === "act",
  check: (s) => s === "priority-verify" || s === "verify",
  file: (s) => s === "fyi",
  all: () => true,
};

/**
 * Headline copy per filter. The heading answers the question the selected
 * group asks, so it changes with the pills rather than always reporting on
 * whether anything needs action.
 *
 * None of these say "this week" any more. The tabs list open obligations with
 * no time bound, so a weekly framing here would describe a scope the numbers
 * underneath no longer have. The weekly claim belongs to the line below, which
 * really is a statistic about the week.
 */
const HEADING: Record<Filter, (n: number) => string> = {
  act: (n) =>
    n === 0 ? "Nothing needs action." : `${count(n)} ${n === 1 ? "thing needs" : "things need"} action.`,
  check: (n) =>
    n === 0 ? "Nothing to check." : `${count(n)} ${n === 1 ? "item" : "items"} to check.`,
  file: (n) =>
    n === 0 ? "Nothing for the file." : `${count(n)} ${n === 1 ? "item" : "items"} for the file.`,
  all: (n) => (n === 0 ? "Nothing open." : `${count(n)} ${n === 1 ? "item" : "items"} open.`),
};

/**
 * Which tier a screen opens on when the URL names none: the most urgent one
 * that actually has something in it, so it never opens on an empty list while
 * work sits one tab away.
 */
export function defaultTier(events: SurfacedEvent[]): Filter {
  if (events.some((e) => MATCHES.act(e.severity))) return "act";
  if (events.some((e) => MATCHES.check(e.severity))) return "check";
  // Not "all": that tab is the combined view on the log now, so landing the
  // overview on it would light a tab that points off this screen.
  return "file";
}

export function tierCounts(events: SurfacedEvent[]) {
  return {
    act: events.filter((e) => MATCHES.act(e.severity)).length,
    check: events.filter((e) => MATCHES.check(e.severity)).length,
    file: events.filter((e) => MATCHES.file(e.severity)).length,
    all: events.length,
  };
}

export function SurfacedFeed({
  events,
  reviewed,
  filter,
  counts,
}: {
  events: SurfacedEvent[];
  reviewed: number;
  filter: Filter;
  /** All six, because the control spans both halves of the log. */
  counts: TabCounts;
}) {
  const visible = events.filter((e) => MATCHES[filter](e.severity));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <PageTitle>{HEADING[filter](counts[filter])}</PageTitle>
        <p className="max-w-[700px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
          {count(reviewed)} items read this week; the rest is in the log.
        </p>
      </div>

      <DecisionTabs active={filter as DecisionTab} counts={counts} />

      {visible.length === 0 ? (
        <p className="py-6 text-center text-[14px] text-faint">Nothing in this group.</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {visible.map((event) => (
            <SurfacedCard key={event.key} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
