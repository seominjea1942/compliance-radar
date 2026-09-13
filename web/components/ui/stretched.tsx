import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The whole-card click target, shared by every card that behaves as one link.
 *
 * Two cards use it now: the item cards on the overview and the log, and the
 * street-work map card. They looked the same until they were edited apart
 * once, so the hover state and the overlay live here rather than being
 * retyped per card.
 */

/**
 * Hover and focus treatment for a card whose whole surface is clickable.
 *
 * `relative` is part of it, not incidental: it is what the stretched link's
 * `::after` is measured against, so a card that takes these classes without it
 * would spread its click target over the nearest positioned ancestor instead.
 *
 * The hover firms the border rather than adding a ring. The map panel used to
 * share this and had no border of its own, which is why the ring existed; it
 * is a plain section now, so the one card left here has an edge to darken and
 * a ring on top of it would draw two lines instead of one darker one.
 */
export const stretchedCard = [
  "relative transition-colors",
  // Ink, not the next grey up. The card is one of a stack of identical
  // frames, so the edge under the pointer has to be the only dark line on
  // screen to be found at a glance; #d4d4d8 was a shade, not an answer.
  "hover:border-ink hover:bg-shell",
  "focus-within:border-ink focus-within:bg-shell",
].join(" ");

/**
 * The card's stretched link: its ::after covers the whole card, so clicking
 * anywhere that is not another control follows this link.
 *
 * No underline in either state. The card's own background carries the hover,
 * and underlining the title on top of it reads as a second, smaller target
 * inside the one the reader is already pointing at.
 */
export function StretchedLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn("no-underline after:absolute after:inset-0 after:content-['']", className)}
      {...props}
    />
  );
}

/** Sits above the stretched link so nested controls stay clickable. */
export function Above({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("relative z-[1]", className)}>{children}</div>;
}
