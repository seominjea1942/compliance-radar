"use client";

import { useState, useTransition } from "react";
import { MdBlock, MdCheck } from "react-icons/md";
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
 * anchored to the button, over the identifying details restated one more time.
 * A popover rather than a modal because the decision is small and local: a
 * dialog over a darkened page is the wrong weight for one row.
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

  const product = item.product;
  const detail = [product?.brand, ...(product?.sizes ?? [])].filter(Boolean);

  return (
    <Popover
      // Below the action row, so the panel covers what comes after the card
      // rather than the item the owner is being asked to confirm. Radix flips
      // it up on its own when the viewport bottom is close.
      side="bottom"
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
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium tracking-[0.04em] text-faint uppercase">
            Check this against your shelf
          </span>
          <span className="text-[13.5px]/snug font-medium text-ink">{item.displayTitle}</span>
          {detail.length > 0 && (
            <span className="text-[12px] text-faint">{detail.join(" · ")}</span>
          )}
          {product?.upcs.length ? (
            <span className="font-mono text-[11.5px] text-faint">
              UPC {product.upcs.join(", ")}
            </span>
          ) : null}
          {/*
            The code is the thing being matched, so it is the strongest
            element here. It runs to hundreds of characters on some recalls
            (one lists 22 sell-by dates), hence the scroll rather than a
            truncation: half a list of date codes reads as the whole list.
          */}
          {product?.codeInfo && (
            <span className="max-h-[92px] self-start overflow-y-auto rounded border border-line-strong bg-shell px-1.5 py-0.5 font-mono text-[11.5px] text-ink">
              {product.codeInfo}
            </span>
          )}
        </div>

        <p className="m-0 text-[12px]/relaxed text-muted">
          Resolving drops this out of your feed. It stays readable in the log.
        </p>

        {error && <span className="text-[12px] text-alert">{error}</span>}

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => commit("not_carried")}
              disabled={pending}
            >
              <MdBlock className="size-[15px]" aria-hidden />
              Don&apos;t carry
            </Button>
            <Button size="sm" onClick={() => commit("handled")} disabled={pending}>
              {pending ? "Saving…" : "Handled"}
            </Button>
          </div>
        </div>
      </div>
    </Popover>
  );
}
