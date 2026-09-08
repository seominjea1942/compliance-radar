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
        "text-[26px]/[1.15] font-bold tracking-[-0.022em] text-balance text-ink md:text-[34px]",
        className,
      )}
      {...props}
    />
  );
}
