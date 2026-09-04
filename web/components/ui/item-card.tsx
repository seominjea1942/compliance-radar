import Link from "next/link";
import * as React from "react";
import { Card, CardActions } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The shared shell for anything representing one decision: surfaced items on
 * the overview, filtered items in the log.
 *
 * It owns the frame, the chip row, the body column and the action row, so the
 * two screens cannot drift apart visually. What differs is what goes inside:
 * the overview leads with the product, the log leads with the reason the item
 * was set aside, which is what each screen is actually for.
 *
 * Compound rather than prop-driven so callers keep reading top to bottom in
 * the order the card renders.
 */
function ItemCard({
  dimmed = false,
  interactive = false,
  onCardClick,
  className,
  children,
}: {
  dimmed?: boolean;
  /**
   * Whole-card hover and click. The click target itself is a stretched link on
   * the card's title (see `ItemCard.Link`), so the link keeps its accessible
   * name and its right-click, middle-click and copy-address behaviour instead
   * of being a div with an onClick.
   */
  interactive?: boolean;
  /**
   * Click anywhere on the card. Used where there is no single destination to
   * link to, such as a grouped event that expands in place. Clicks that landed
   * on a nested link or button are ignored, so the card never hijacks its own
   * controls; z-index alone would not do that, since events still bubble.
   */
  onCardClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const handleClick = onCardClick
    ? (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest("a,button,input,[role='dialog']")) return;
        onCardClick();
      }
    : undefined;

  return (
    <Card
      tone="inset"
      onClick={handleClick}
      className={cn(
        "gap-3.5 transition-opacity duration-300",
        dimmed ? "opacity-55" : "opacity-100",
        interactive &&
          "relative transition-[background-color,border-color,box-shadow] " +
            "hover:border-card-hover-line hover:bg-card-hover " +
            "hover:shadow-[0_1px_3px_rgba(24,24,27,0.08)] " +
            "focus-within:border-card-hover-line focus-within:bg-card-hover",
        onCardClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </Card>
  );
}

/**
 * The card's stretched link: its ::after covers the whole card, so clicking
 * anywhere that is not another control follows this link.
 */
function StretchedLink({
  className,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn("no-underline after:absolute after:inset-0 after:content-['']", className)}
      {...props}
    />
  );
}

/** Sits above the stretched link so nested controls stay clickable. */
function Above({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("relative z-[1]", className)}>{children}</div>;
}

function Chips({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2.5">{children}</div>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2.5">{children}</div>;
}

function Actions({ children }: { children: React.ReactNode }) {
  // z-index keeps the buttons above the stretched link covering the card.
  return <CardActions className="relative z-[1]">{children}</CardActions>;
}

ItemCard.Chips = Chips;
ItemCard.Body = Body;
ItemCard.Actions = Actions;
ItemCard.Link = StretchedLink;
ItemCard.Above = Above;

export { ItemCard };
