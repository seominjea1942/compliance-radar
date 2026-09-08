"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { segmented } from "@/components/ui/segmented";
import { count } from "@/lib/format";
import { hrefFor, PAGE, VIEWS, type View, type ViewParams } from "@/lib/view";
import { cn } from "@/lib/utils";

/**
 * Every state a decision can be in, in one control.
 *
 * Four of them are things the radar surfaced, ranked by what they ask of the
 * owner; two are things it did not, split by whether that call still stands.
 * They were two controls on two screens, which made the log read as a
 * different product rather than the other half of this one. The screens stay
 * separate underneath, because they page differently and their rows lead with
 * different things, but there is one control across both.
 *
 * Links, not buttons. Half of these need the server: the set-aside half is
 * 577 rows paged 25 at a time, so its filter has to be in the URL, and a
 * control that is a link for two items and a button for four is one control
 * pretending to be two again.
 */
export type TabCounts = Record<View, number>;

const LABEL: Record<View, string> = {
  act: "Needs action",
  check: "To check",
  file: "For the file",
  "set-aside": "Set aside",
  overturned: "Overturned",
  all: "All",
};

export function DecisionTabs({
  params,
  counts,
  className,
}: {
  params: ViewParams;
  counts: TabCounts;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);

  /*
   * Keep the selected item in view. The strip scrolls now, and arriving on a
   * late view by link left it selected somewhere off to the right with the
   * strip resting at zero: the control looked like it had nothing chosen.
   *
   * scrollLeft on the track itself, not scrollIntoView, which walks up every
   * scrollable ancestor and would drag the page with it.
   */
  useEffect(() => {
    const el = track.current;
    const on = el?.querySelector<HTMLElement>("[aria-current]");
    if (!el || !on) return;
    const left = on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2;
    el.scrollLeft = Math.max(0, left);
  }, [params.view]);

  return (
    <div ref={track} className={cn(segmented.track, "self-start", className)}>
      {VIEWS.map((v) => {
        const on = v === params.view;
        return (
          <Link
            key={v}
            href={hrefFor({ view: v, limit: PAGE }, params)}
            aria-current={on ? "page" : undefined}
            className={cn(segmented.item, "no-underline", on ? segmented.active : segmented.idle)}
          >
            {LABEL[v]}
            <span
              className={cn(
                "font-mono text-[11px] tabular-nums",
                on ? segmented.countActive : segmented.countIdle,
              )}
            >
              {count(counts[v])}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
