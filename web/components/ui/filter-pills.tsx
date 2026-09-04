"use client";

import { cn } from "@/lib/utils";

export type FilterOption<T extends string> = {
  value: T;
  label: string;
  count: number;
};

/**
 * Segmented control for filtering a list in place.
 *
 * Buttons with `aria-pressed` rather than a tablist: these filter one list
 * rather than swapping between panels, so radio/toggle semantics describe it
 * more honestly than tabs do.
 */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Filter items"
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-full border border-line bg-rail p-1",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            disabled={o.count === 0 && !active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium",
              "transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-40",
              active
                ? "bg-paper text-ink shadow-[0_1px_2px_rgba(24,24,27,0.06)]"
                : "text-muted hover:text-ink enabled:hover:bg-hover",
            )}
          >
            {o.label}
            <span
              className={cn(
                "font-mono text-[11px] tabular-nums",
                active ? "text-monoink" : "text-faint",
              )}
            >
              {o.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
