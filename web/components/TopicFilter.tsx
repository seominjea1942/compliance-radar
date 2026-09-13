"use client";

import Link from "next/link";
import { useState } from "react";
import { MdFilterList } from "react-icons/md";
import { Popover } from "@/components/ui/popover";
import { count } from "@/lib/format";
import { TAGS } from "@/lib/queries";
import { hrefFor, PAGE, type ViewParams } from "@/lib/view";
import { cn } from "@/lib/utils";

/**
 * Topic, behind a button beside the state control.
 *
 * The six topics were a second row of pills under the first, which read as
 * one control of eleven items rather than two of six and five. They are the
 * narrower question and the one asked less often, so they fold into a button
 * and the row above keeps the width.
 *
 * The button says whether anything is on: a topic selected inside a closed
 * panel is a filter nobody can see, which is the failure mode of putting a
 * filter behind a button at all.
 */
export function TopicFilter({
  params,
  counts,
}: {
  params: ViewParams;
  /** Rows per topic in the current view, so a dead option can say so. */
  counts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const active = TAGS.find((t) => t.id === params.tag) ?? null;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side="bottom"
      align="end"
      className="w-[248px] p-1.5"
      trigger={
        <button
          type="button"
          aria-label={active ? `Topic: ${active.label}. Change` : "Filter by topic"}
          className={cn(
            "flex flex-none cursor-pointer items-center gap-1.5 rounded-[2px] border transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            // The same rule the segmented control is framed in, so the two
            // read as one row of controls rather than a black box beside a
            // grey one.
            "border-rule",
            active
              ? "bg-brand-tint px-3.5 py-2 text-[13.5px] font-medium text-brand"
              : "size-[42px] justify-center bg-paper text-muted hover:bg-hover hover:text-ink",
          )}
        >
          <MdFilterList className="size-[18px] flex-none" aria-hidden />
          {active && <span>{active.label}</span>}
        </button>
      }
    >
      <div className="flex flex-col gap-0.5">
        <span className="px-2 pt-1.5 pb-1 font-mono text-[10px] tracking-[0.1em] text-ghost uppercase">
          Topic
        </span>
        {[{ id: null as string | null, label: "All topics" }, ...TAGS].map((t) => {
          const on = t.id === params.tag;
          const n = t.id ? (counts[t.id] ?? 0) : null;
          return (
            <Link
              key={t.id ?? "all"}
              href={hrefFor({ tag: t.id, limit: PAGE }, params)}
              onClick={() => setOpen(false)}
              aria-current={on ? "true" : undefined}
              className={cn(
                "flex items-center gap-2 px-2 py-2 text-[13px] no-underline transition-colors",
                on ? "bg-hover font-medium text-ink" : "text-muted hover:bg-hover hover:text-ink",
              )}
            >
              <span className="flex-1">{t.label}</span>
              {n !== null && (
                <span className="font-mono text-[11px] tabular-nums text-faint">{count(n)}</span>
              )}
            </Link>
          );
        })}
      </div>
    </Popover>
  );
}
