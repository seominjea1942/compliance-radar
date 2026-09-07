"use client";

import { segmented } from "@/components/ui/segmented";
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
      className={cn(segmented.track, className)}
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
              segmented.item,
              "disabled:cursor-not-allowed disabled:opacity-40",
              active ? segmented.active : segmented.idle,
            )}
          >
            {o.label}
            <span
              className={cn(
                "font-mono text-[11px] tabular-nums",
                active ? segmented.countActive : segmented.countIdle,
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
