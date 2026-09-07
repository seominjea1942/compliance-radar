import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Two card weights: `paper` for the outer panels that sit on the shell, and
 * `inset` for items nested inside one (a surfaced alert inside the feed panel).
 *
 * There is deliberately no urgent tone. Colouring the whole card border red
 * competed with the alert banner inside it; the banner carries that signal.
 *
 * Both are translucent, so the canvas gradient behind them tints the panel
 * instead of stopping at its edge. Opaque white cards covered so much of the
 * screen that the wash survived only in the gutters and read as a printing
 * error. The alpha is high enough that ink on these keeps well past the
 * contrast floor. The alphas are set by measurement, not taste: at 0.72 the
 * faintest label inside a card landed at 4.40:1, just under AA, and these
 * put it back over while the wash still reads through the panel.
 */
function Card({
  className,
  tone = "paper",
  ...props
}: React.ComponentProps<"div"> & { tone?: "paper" | "inset" }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col border",
        // Alpha only, no backdrop-filter. Blurring the backdrop of the log
        // page, whose outer panel is one 7,000px card, made the browser
        // snapshot a layer that size and paint nothing at all below the
        // fold. There is also nothing to blur: the backdrop is a smooth
        // gradient, so the filter cost a whole screen to change no pixels.
        tone === "paper" && "rounded-card border-line bg-paper/82 px-6.5 py-5.5",
        tone === "inset" && "rounded-panel border-line bg-shell/72 px-5.5 py-5",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({
  className,
  as: Comp = "h2",
  ...props
}: React.ComponentProps<"h2"> & { as?: React.ElementType }) {
  return (
    <Comp
      data-slot="card-title"
      // Section headers are the product speaking, so they take the UI face.
      // Source content (item titles, reasons) stays on the serif.
      className={cn("text-[17px] font-semibold tracking-[-0.01em] text-ink", className)}
      {...props}
    />
  );
}

function CardNote({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-note"
      className={cn("text-sm/relaxed text-faint", className)}
      {...props}
    />
  );
}

/** The hairline above a card's action row. */
function CardActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-actions"
      className={cn(
        "mt-1 flex flex-wrap items-center gap-1 border-t border-line-soft pt-3",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardTitle, CardNote, CardActions };
