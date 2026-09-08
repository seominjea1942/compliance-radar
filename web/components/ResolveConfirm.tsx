"use client";

import { useState, useTransition } from "react";
import { MdCheck } from "react-icons/md";
import { resolveItems } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import type { Resolution } from "@/lib/resolution";
import type { SurfacedItem } from "@/lib/queries";

/**
 * The confirm step for a single-product card.
 *
 * A grouped event resolves through `ResolveDialog`, where there is a real
 * choice to make per product. A single item has no such choice, but it still
 * has a consequence: the row leaves the feed, and the codes are the only thing
 * that says whether the recall is even the owner's problem. Resolve used to
 * write immediately, so a mis-click closed an item with no chance to read it.
 *
 * So the same two outcomes the dialog offers are offered here, on a popover
 * anchored to the button. It restates nothing: the panel opens directly under
 * the card's own title, brand, size and code, and repeating those made the
 * confirm longer than the thing being confirmed. A popover rather than a
 * modal because the decision is small and local: a dialog over a darkened
 * page is the wrong weight for one row.
 */
export function ResolveConfirm({
  item,
  disabled,
  onResolved,
}: {
  item: SurfacedItem;
  disabled?: boolean;
  onResolved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function commit(resolution: Resolution) {
    setError(null);
    startTransition(async () => {
      const res = await resolveItems([{ decisionId: item.decisionId, resolution }]);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      onResolved();
    });
  }

  return (
    <Popover
      // Below the action row, so the panel covers what comes after the card
      // rather than the item the owner is being asked to confirm. Radix flips
      // it up on its own when the viewport bottom is close.
      side="bottom"
      className="w-[236px] p-3"
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setError(null);
        setOpen(next);
      }}
      trigger={
        <Button variant="cardAction" size="action" disabled={disabled}>
          <MdCheck className="size-[15px]" aria-hidden />
          Resolve
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {/*
          The product is not restated here. This panel opens two centimetres
          under the card's own title, brand, size and code; repeating all of
          it made the confirm longer than the thing it was confirming. What
          is left is the only thing the panel is for: which of the two ways
          this ends.
        */}
        <span className="text-[13px]/snug text-muted">How did this end?</span>

        {error && <span className="text-[12px] text-alert">{error}</span>}

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => commit("handled")} disabled={pending} className="flex-1">
            {pending ? "Saving…" : "Handled"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => commit("not_carried")}
            disabled={pending}
            className="flex-1"
          >
            Don&apos;t carry
          </Button>
        </div>
      </div>
    </Popover>
  );
}
