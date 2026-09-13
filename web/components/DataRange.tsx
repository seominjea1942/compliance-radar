"use client";

import Link from "next/link";
import { useState } from "react";
import { MdCheck, MdExpandMore } from "react-icons/md";
import { Popover } from "@/components/ui/popover";
import { hrefFor, PAGE, SPAN_LABEL, SPANS, type ViewParams } from "@/lib/view";

/**
 * The span the page is answering for, above the headline.
 *
 * Set as text rather than as a control: it is a statement about the data
 * first, and a way to change the span second. The chevron is the only thing
 * that says it opens, which is the weight the affordance deserves.
 *
 * Presets, not a calendar. The span is a frame for reading the week's work,
 * not a report parameter, and a picker for it would be more interface than the
 * three answers anyone wants. It lives in the URL, so a narrowed screen is
 * still a link you can send someone.
 */
export function DataRange({
  params,
  fullLabel,
}: {
  params: ViewParams;
  /** The dates the radar actually holds, shown when the span is "all". */
  fullLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const label = params.span === "all" ? fullLabel : SPAN_LABEL[params.span];

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side="bottom"
      align="center"
      className="w-[212px] p-1.5"
      trigger={
        <button
          type="button"
          aria-label={`Showing ${label}. Change the span`}
          className="flex cursor-pointer items-center gap-1 rounded-control bg-transparent px-1 py-0.5 text-[11.5px] font-medium tracking-[0.14em] text-muted uppercase transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {label}
          <MdExpandMore className="size-[15px] flex-none" aria-hidden />
        </button>
      }
    >
      <div className="flex flex-col gap-0.5">
        {SPANS.map((s) => {
          const on = s === params.span;
          return (
            <Link
              key={s}
              /*
               * A new span starts at page one: keeping a grown limit would
               * page through rows the span has just excluded.
               */
              href={hrefFor({ span: s, limit: PAGE }, params)}
              onClick={() => setOpen(false)}
              aria-current={on ? "page" : undefined}
              className={`flex items-center gap-2 px-2 py-1.5 text-[13px] no-underline transition-colors ${
                on ? "bg-hover font-medium text-ink" : "text-body hover:bg-hover hover:text-ink"
              }`}
            >
              <MdCheck
                className={`size-4 flex-none ${on ? "text-ink" : "text-transparent"}`}
                aria-hidden
              />
              <span className="flex-1">{SPAN_LABEL[s]}</span>
            </Link>
          );
        })}
      </div>
    </Popover>
  );
}
