"use client";

import { Tooltip } from "@/components/ui/tooltip";

export type LegendEntry = { color: string; label: string; explain: string; count: number };

/**
 * What the pins mean. Four short words with the detail on hover: a legend that
 * explains itself in full takes more room than the map it describes.
 */
export function MapLegend({ entries }: { entries: LegendEntry[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1.5 p-0">
      {entries
        .filter((e) => e.count > 0)
        .map((e) => (
          <li key={e.label}>
            <Tooltip content={e.explain}>
              <span
                tabIndex={0}
                className="flex cursor-help items-center gap-1.5 rounded-control text-[11px] text-faint outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  aria-hidden
                  className="size-2 flex-none rounded-full"
                  style={{ background: e.color }}
                />
                {e.label}
                <span className="font-mono text-monoink">{e.count}</span>
              </span>
            </Tooltip>
          </li>
        ))}
    </ul>
  );
}
