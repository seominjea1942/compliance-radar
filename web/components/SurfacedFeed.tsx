"use client";

import { useMemo, useState } from "react";
import { FilterPills, type FilterOption } from "@/components/ui/filter-pills";
import { SurfacedCard } from "@/components/SurfacedCard";
import type { Severity, SurfacedItem } from "@/lib/queries";

type Filter = "act" | "check" | "file" | "all";

/** Which display tiers each filter admits. */
const MATCHES: Record<Filter, (s: Severity) => boolean> = {
  act: (s) => s === "act",
  check: (s) => s === "priority-verify" || s === "verify",
  file: (s) => s === "fyi",
  all: () => true,
};

export function SurfacedFeed({ items }: { items: SurfacedItem[] }) {
  const counts = useMemo(
    () => ({
      act: items.filter((i) => MATCHES.act(i.severity)).length,
      check: items.filter((i) => MATCHES.check(i.severity)).length,
      file: items.filter((i) => MATCHES.file(i.severity)).length,
      all: items.length,
    }),
    [items],
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

  const visible = items.filter((i) => MATCHES[filter](i.severity));

  return (
    <div className="flex flex-col gap-4">
      <FilterPills options={options} value={filter} onChange={setFilter} className="self-start" />

      {visible.length === 0 ? (
        <p className="py-6 text-center text-[14px] text-faint">
          Nothing in this group this week.
        </p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {visible.map((item) => (
            <SurfacedCard key={item.decisionId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
