"use client";

import { useState } from "react";
import { MdExpandMore } from "react-icons/md";
import { Popover } from "@/components/ui/popover";

/**
 * The span the page is answering for, above the headline.
 *
 * Set as text rather than as a control: it is a statement about the data
 * first, and a way to change the span second. The chevron is the only thing
 * that says it opens, which is the weight the affordance deserves while the
 * span is not yet selectable.
 *
 * It opens something rather than nothing. A chevron that does not respond is
 * the trap the business switcher was already in once: the affordance promises
 * a menu, so the panel says plainly why there is no choice to make yet.
 */
export function DataRange({ label }: { label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side="bottom"
      align="center"
      className="w-[260px] p-3"
      trigger={
        <button
          type="button"
          aria-label={`Showing ${label}. Change the range`}
          className="flex cursor-pointer items-center gap-1 rounded-control bg-transparent px-1 py-0.5 text-[11.5px] font-medium tracking-[0.14em] text-muted uppercase transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {label}
          <MdExpandMore className="size-[15px] flex-none" aria-hidden />
        </button>
      }
    >
      <p className="m-0 text-[12.5px]/relaxed text-muted">
        This is everything the radar holds: its first check to its most recent
        one. Choosing a narrower span is not built yet.
      </p>
    </Popover>
  );
}
