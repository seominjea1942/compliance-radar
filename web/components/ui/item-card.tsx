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
  className,
  children,
}: {
  dimmed?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      tone="inset"
      className={cn(
        "gap-3.5 transition-opacity duration-300",
        dimmed ? "opacity-55" : "opacity-100",
        className,
      )}
    >
      {children}
    </Card>
  );
}

function Chips({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2.5">{children}</div>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2.5">{children}</div>;
}

ItemCard.Chips = Chips;
ItemCard.Body = Body;
ItemCard.Actions = CardActions;

export { ItemCard };
