"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { plainDate } from "@/lib/format";
import type { Permit, StreetWork } from "@/lib/queries";

export type HoverTarget =
  | { kind: "work"; work: StreetWork }
  | { kind: "permit"; permit: Permit };

const EDGE = 12;
const WIDTH = 260;

/**
 * The hover detail, rendered into the body rather than the card.
 *
 * The map clips anything drawn inside it, and the card sits in a 380px rail,
 * so a panel wide enough to read the city's work text has to escape both. A
 * portal with fixed positioning is the only thing neither can crop.
 */
function metres(d: number | null): string {
  if (d === null) return "";
  return d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`;
}

export function MapHoverCard({
  target,
  at,
}: {
  target: HoverTarget | null;
  at: { x: number; y: number } | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !target || !at) return null;

  // Kept inside the viewport rather than running off whichever edge is nearest.
  const left = Math.min(Math.max(at.x + 16, EDGE), window.innerWidth - WIDTH - EDGE);
  const top = Math.min(Math.max(at.y + 16, EDGE), window.innerHeight - 140);

  return createPortal(
    <div
      role="tooltip"
      style={{ left, top, width: WIDTH }}
      className="pointer-events-none fixed z-[60] flex flex-col gap-1 rounded-lg border border-line-strong bg-paper px-3 py-2.5 text-[11.5px] shadow-[0_6px_20px_rgba(24,24,27,0.16)]"
    >
      {target.kind === "permit" ? (
        <>
          {/* Building permit titles run to hundreds of characters. */}
          <span className="line-clamp-3 font-medium text-ink">{target.permit.title}</span>
          <span className="text-faint">
            {[
              "Building permit",
              target.permit.distanceM !== null && `${metres(target.permit.distanceM)} away`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </>
      ) : (
        <>
          <span className="font-medium text-ink">
            {target.work.segment ?? target.work.title}
            {target.work.onStoreStreet && (
              <span className="ml-1.5 text-brand">your street</span>
            )}
          </span>

          {target.work.workType === "pavement_moratorium" ? (
            <span className="text-faint">Recently paved. No digging allowed here.</span>
          ) : (
            <>
              {target.work.workDescription && (
                <span className="line-clamp-3 text-muted">{target.work.workDescription}</span>
              )}
              <span className="text-faint">
                {[
                  plainDate(target.work.expiryDate) &&
                    `valid through ${plainDate(target.work.expiryDate)}`,
                  target.work.distanceM !== null && `${metres(target.work.distanceM)} away`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
