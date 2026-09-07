"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { plainDate } from "@/lib/format";
import type { StreetWork } from "@/lib/queries";

const EDGE = 12;
const WIDTH = 260;

/**
 * The hover detail, rendered into the body rather than the card.
 *
 * The map clips anything drawn inside it, and the card sits in a 380px rail,
 * so a panel wide enough to read the city's work text has to escape both. A
 * portal with fixed positioning is the only thing neither can crop.
 */
export function MapHoverCard({
  work,
  at,
}: {
  work: StreetWork | null;
  at: { x: number; y: number } | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !work || !at) return null;

  // Kept inside the viewport rather than running off whichever edge is nearest.
  const left = Math.min(Math.max(at.x + 16, EDGE), window.innerWidth - WIDTH - EDGE);
  const top = Math.min(Math.max(at.y + 16, EDGE), window.innerHeight - 140);

  const moratorium = work.workType === "pavement_moratorium";

  return createPortal(
    <div
      role="tooltip"
      style={{ left, top, width: WIDTH }}
      className="pointer-events-none fixed z-[60] flex flex-col gap-1 rounded-lg border border-line-strong bg-paper px-3 py-2.5 text-[11.5px] shadow-[0_6px_20px_rgba(24,24,27,0.16)]"
    >
      <span className="font-medium text-ink">
        {work.segment ?? work.title}
        {work.onStoreStreet && <span className="ml-1.5 text-green">your street</span>}
      </span>

      {moratorium ? (
        <span className="text-faint">Recently paved. No digging allowed here.</span>
      ) : (
        <>
          {work.workDescription && (
            <span className="line-clamp-3 text-muted">{work.workDescription}</span>
          )}
          <span className="text-faint">
            {[
              plainDate(work.expiryDate) && `valid through ${plainDate(work.expiryDate)}`,
              work.distanceM !== null && `${Math.round(work.distanceM)} m away`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </>
      )}
    </div>,
    document.body,
  );
}
