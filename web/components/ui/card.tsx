import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The design uses two card weights: `paper` for the outer panels that sit on
 * the shell, and `inset` for items nested inside one (a surfaced alert inside
 * the feed panel). Tone `urgent` swaps the border to the warm alert line.
 */
function Card({
  className,
  tone = "paper",
  ...props
}: React.ComponentProps<"div"> & { tone?: "paper" | "inset" | "urgent" }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col border",
        tone === "paper" && "rounded-card border-line bg-paper px-6.5 py-5.5",
        tone === "inset" && "rounded-panel border-line bg-shell px-5.5 py-5",
        tone === "urgent" && "rounded-panel border-line-warm bg-shell px-5.5 py-5",
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
