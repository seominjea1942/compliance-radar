import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Two card weights: `paper` for the outer panels that still carry a frame,
 * and `inset` for the items in a feed, which carry none: they are separated
 * by a rule above each one, the way entries in a ledger are.
 *
 * There is deliberately no urgent tone. Colouring the whole card border red
 * competed with the alert banner inside it; the banner carries that signal.
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
        "flex flex-col",
        tone === "paper" && "rounded-card border border-line bg-paper px-6.5 py-5.5",
        /*
         * No box. One heavy rule above each item and nothing else: on a cream
         * page the framed version drew a second rectangle around content that
         * was already the same colour as everything outside it, so the frame
         * was the only thing the eye had to do. The rule says "a new item
         * starts here", which is all the frame was ever for.
         *
         * Flush to the column, so the item's first word lines up with the
         * control above it rather than sitting 22px inside its own box.
         *
         * The first item draws no rule: the label above the list already
         * drew one, and two heavy lines with 20px between them read as a
         * mistake rather than as a frame.
         */
        tone === "inset" && "border-t-2 border-rule px-0 py-5 first:border-t-0 first:pt-4",
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

/**
 * The line under a section's name.
 *
 * Body colour and body size, not a caption's. This is the sentence that says
 * what the section is for and how the radar uses it, so it is set like the
 * table under it rather than a step smaller: greyed-out, shrunken text asks
 * to be skipped.
 */
function CardNote({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-note"
      className={cn("text-[15px]/relaxed text-body", className)}
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
