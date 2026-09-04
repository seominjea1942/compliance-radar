"use client";

import { useMemo, useState } from "react";
import { FilterPills, type FilterOption } from "@/components/ui/filter-pills";
import { SurfacedCard } from "@/components/SurfacedCard";
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
 */
const HEADING: Record<Filter, (n: number) => string> = {
  act: (n) =>
    n === 0
      ? "Nothing needs action this week."
      : `${count(n)} ${n === 1 ? "thing needs" : "things need"} action.`,
  check: (n) =>
    n === 0 ? "Nothing to check this week." : `${count(n)} ${n === 1 ? "item" : "items"} to check.`,
  file: (n) =>
    n === 0
      ? "Nothing for the file this week."
      : `${count(n)} ${n === 1 ? "item" : "items"} for the file.`,
  all: (n) =>
    n === 0 ? "Nothing surfaced this week." : `${count(n)} ${n === 1 ? "item" : "items"} surfaced.`,
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

  const visible = events.filter((e) => MATCHES[filter](e.severity));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[20px]/tight font-semibold tracking-[-0.01em] text-ink md:text-[23px]">
          {HEADING[filter](counts[filter])}
        </h1>
        <p className="max-w-[700px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
          {count(reviewed)} items read this week; the rest is in the log.
        </p>
      </div>

      <FilterPills options={options} value={filter} onChange={setFilter} className="self-start" />

      {visible.length === 0 ? (
        <p className="py-6 text-center text-[14px] text-faint">
          Nothing in this group this week.
        </p>
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
