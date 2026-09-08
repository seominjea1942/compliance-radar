"use client";

import { useMemo, useState } from "react";
import { FilterPills, type FilterOption } from "@/components/ui/filter-pills";
import { SurfacedCard } from "@/components/SurfacedCard";
import { PageTitle } from "@/components/ui/page-title";
import { count } from "@/lib/format";
import { TAGS, type Severity, type SurfacedEvent } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Filter = "act" | "check" | "file" | "all";

/**
 * An event's topics are the union of its items'. A grouped recall can span
 * more than one, and a card that matched on only its lead's tags would
 * disappear from a topic that half its products belong to.
 */
function topicsOf(event: SurfacedEvent): string[] {
  return [...new Set(event.items.flatMap((i) => i.tags))];
}

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

export function SurfacedFeed({
  events,
  reviewed,
}: {
  events: SurfacedEvent[];
  reviewed: number;
}) {
  // Counts are per card, because that is what the pills navigate. The
  // per-item totals stay on the topic table and the weekly strip.
  const counts = useMemo(
    () => ({
      act: events.filter((e) => MATCHES.act(e.severity)).length,
      check: events.filter((e) => MATCHES.check(e.severity)).length,
      file: events.filter((e) => MATCHES.file(e.severity)).length,
      all: events.length,
    }),
    [events],
  );

  /*
   * Open on the most urgent group that actually has something in it, so the
   * screen never opens on an empty list while work sits one tab away.
   */
  const [filter, setFilter] = useState<Filter>(() =>
    counts.act > 0 ? "act" : counts.check > 0 ? "check" : counts.file > 0 ? "file" : "all",
  );

  const options: FilterOption<Filter>[] = [
    { value: "act", label: "Needs action", count: counts.act },
    { value: "check", label: "To check", count: counts.check },
    { value: "file", label: "For the file", count: counts.file },
    { value: "all", label: "All", count: counts.all },
  ];

  /*
   * Topic narrows whatever the tier pills selected, the way it does on the
   * log: the two are different questions about the same list, not two lists.
   * Counted inside the current tier so a topic never advertises rows the tier
   * above it is hiding.
   */
  const [topic, setTopic] = useState<string | null>(null);
  const inTier = events.filter((e) => MATCHES[filter](e.severity));

  const topicCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of inTier) for (const t of topicsOf(e)) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  }, [inTier]);

  /*
   * The row lists every topic the feed holds, not only the ones in the tier
   * on screen, and greys out the ones this tier has none of. That is what the
   * weekly table did: it named the quiet topics too, because "nothing in
   * council routine" is the answer to a question the owner is asking, and a
   * row that reshuffles itself on every tab is a row you cannot learn.
   */
  const feedTopics = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) for (const t of topicsOf(e)) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  }, [events]);

  const topicOptions = TAGS.filter((t) => (feedTopics.get(t.id) ?? 0) > 0);
  // Selecting a topic then switching to a tier without it would show nothing
  // and blame the empty state; the selection falls back to all instead.
  const activeTopic = topic && (topicCounts.get(topic) ?? 0) > 0 ? topic : null;

  const visible = activeTopic
    ? inTier.filter((e) => topicsOf(e).includes(activeTopic))
    : inTier;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <PageTitle>{HEADING[filter](counts[filter])}</PageTitle>
        <p className="max-w-[700px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
          {count(reviewed)} items read this week; the rest is in the log.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <FilterPills options={options} value={filter} onChange={setFilter} className="self-start" />

        {/*
          The topic row from the weekly table, brought under the tabs. Same
          shape as the log's, so the two screens narrow a list the same way.
          Hidden when a single topic covers everything in the tier: a row with
          one option to choose is a label pretending to be a control.
        */}
        {topicOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {[{ id: null as string | null, label: "All topics" }, ...topicOptions].map((t) => {
              const active = t.id === activeTopic;
              const n = t.id ? (topicCounts.get(t.id) ?? 0) : inTier.length;
              const empty = n === 0;
              return (
                <button
                  key={t.id ?? "all"}
                  type="button"
                  aria-pressed={active}
                  disabled={empty}
                  onClick={() => setTopic(t.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] transition-colors",
                    active && "border-brand-soft bg-brand-tint font-medium text-brand",
                    !active && !empty && "border-line text-muted hover:border-line-strong hover:text-ink",
                    empty && "cursor-not-allowed border-line-soft text-ghost",
                  )}
                >
                  {t.label}
                  {t.id && (
                    <span
                      className={cn(
                        "font-mono text-[11px] tabular-nums",
                        active ? "text-brand" : empty ? "text-ghost" : "text-faint",
                      )}
                    >
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

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
