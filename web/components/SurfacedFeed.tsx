"use client";

import { useMemo, useState } from "react";
import { FilterPills, type FilterOption } from "@/components/ui/filter-pills";
import { SurfacedCard } from "@/components/SurfacedCard";
import type { Severity, SurfacedEvent } from "@/lib/queries";

type Filter = "act" | "check" | "file" | "all";

/** Which display tiers each filter admits. */
const MATCHES: Record<Filter, (s: Severity) => boolean> = {
  act: (s) => s === "act",
  check: (s) => s === "priority-verify" || s === "verify",
  file: (s) => s === "fyi",
  all: () => true,
};

export function SurfacedFeed({ events }: { events: SurfacedEvent[] }) {
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

  // Open on what needs acting on. Landing on all 48 is the scroll problem the
  // filter exists to solve; fall back to "all" only when nothing needs action.
  const [filter, setFilter] = useState<Filter>(counts.act > 0 ? "act" : "all");

  const options: FilterOption<Filter>[] = [
    { value: "act", label: "Needs action", count: counts.act },
    { value: "check", label: "To check", count: counts.check },
    { value: "file", label: "For the file", count: counts.file },
    { value: "all", label: "All", count: counts.all },
  ];

  const visible = events.filter((e) => MATCHES[filter](e.severity));

  return (
    <div className="flex flex-col gap-4">
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
