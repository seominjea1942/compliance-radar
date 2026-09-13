import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The one headline at the top of a screen.
 *
 * Its own component because five screens carry it and two sizes had already
 * drifted apart: the overview was bumped on its own and the log, profile,
 * street work and about pages were left three points behind it, which reads
 * as the overview being a different product rather than a louder page.
 *
 * Set large deliberately: it is the one sentence that says what the week
 * amounts to, and at the old 34px it read as a section label rather than the
 * answer. Tracking tightens as it grows, or the extra size only adds gaps.
 *
 * Sized by clamp rather than a breakpoint, so it scales with the window
 * continuously instead of jumping once at md: 34px floor, 5.6vw, 62px cap.
 *
 * Not for source text. The item page's title is the recall's own wording at
 * whatever length the FDA wrote it, which is a different job and keeps its
 * own treatment.
 */
export function PageTitle({
  className,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "text-[clamp(34px,5.6vw,62px)]/[1.06] font-bold tracking-[-0.03em] text-balance text-ink",
        className,
      )}
      {...props}
    />
  );
}
