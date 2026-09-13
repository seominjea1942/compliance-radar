"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MdExpandMore } from "react-icons/md";
import { Popover } from "@/components/ui/popover";
import { segmented } from "@/components/ui/segmented";
import { count } from "@/lib/format";
import { hrefFor, isLogView, PAGE, SURFACED_VIEWS, type View, type ViewParams } from "@/lib/view";
import { cn } from "@/lib/utils";

/**
 * Every state a decision can be in, in one control.
 *
 * Three of them are things the radar surfaced, ranked by what they ask of the
 * owner, and they are the whole point of the screen, so they get the room.
 * The other three are things it did not surface, split by whether that call
 * still stands; they are the audit, reached often enough to belong here and
 * rarely enough not to earn a quarter of the row each. They sit behind the
 * fourth item, which is a menu rather than a destination.
 *
 * Links, not buttons. Half of these need the server: the set-aside half is
 * 709 rows paged 25 at a time, so its filter has to be in the URL, and a
 * control that is a link for three items and a button for three is one
 * control pretending to be two.
 */
export type TabCounts = Record<View, number>;

const LABEL: Record<View, string> = {
  act: "Needs action",
  check: "To check",
  file: "For the file",
  handled: "Handled",
  "set-aside": "Set aside",
  overturned: "Overturned",
  all: "All",
};

/**
 * What sits behind the menu, in the order the record is usually read.
 *
 * "Handled" is not part of the log -- the log is what was never surfaced --
 * but it is the same kind of destination: something you go and look at rather
 * than something waiting for you, so it shares the menu rather than taking a
 * quarter of the row.
 */
const LOG_VIEWS = ["handled", "set-aside", "overturned", "all"] as const;

function Count({ n, on }: { n: number; on: boolean }) {
  return (
    <span
      className={cn(
        "font-mono text-[12px] tabular-nums",
        on ? segmented.countActive : segmented.countIdle,
      )}
    >
      {count(n)}
    </span>
  );
}

export function DecisionTabs({
  params,
  counts,
  className,
}: {
  params: ViewParams;
  counts: TabCounts;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const onLog = isLogView(params.view);

  /*
   * Keep the selected item in view. The row wraps before the track has to
   * scroll, so this is the last resort for a window too narrow even for the
   * wrapped layout: arriving on a late view would otherwise leave it selected
   * off to the right with the track resting at zero.
   *
   * scrollLeft on the track itself, not scrollIntoView, which walks up every
   * scrollable ancestor and would drag the page with it.
   */
  useEffect(() => {
    const el = track.current;
    const on = el?.querySelector<HTMLElement>("[aria-current]");
    if (!el || !on) return;
    el.scrollLeft = Math.max(0, on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2);
  }, [params.view]);
  /*
   * The menu wears whichever of its three is showing, and its own name when
   * none of them is. It used to fall back to "Set aside 709", which claimed
   * one of its children was selected when nothing was, and put that child's
   * count on a control that stood for all three. A parent gets a parent's
   * name, and no count until one of its children is actually the view.
   */
  const inMenu = onLog || params.view === "handled";
  const menuLabel = inMenu ? LABEL[params.view] : "The record";

  return (
    <div ref={track} className={cn(segmented.track, "self-start", className)}>
      {SURFACED_VIEWS.map((v) => {
        const on = v === params.view;
        return (
          <Link
            key={v}
            href={hrefFor({ view: v, limit: PAGE }, params)}
            aria-current={on ? "page" : undefined}
            className={cn(segmented.item, "no-underline", on ? segmented.active : segmented.idle)}
          >
            {LABEL[v]}
            <Count n={counts[v]} on={on} />
          </Link>
        );
      })}

      <Popover
        open={open}
        onOpenChange={setOpen}
        side="bottom"
        align="end"
        className="w-[212px] p-1.5"
        trigger={
          <button
            type="button"
            aria-current={inMenu ? "page" : undefined}
            aria-label={`${menuLabel}. Show everything the radar read`}
            className={cn(segmented.item, inMenu ? segmented.active : segmented.idle)}
          >
            {menuLabel}
            {inMenu && <Count n={counts[params.view]} on />}
            <MdExpandMore
              className={cn("size-[16px] flex-none", inMenu ? "text-paper/65" : "text-muted")}
              aria-hidden
            />
          </button>
        }
      >
        <div className="flex flex-col gap-0.5">
          {LOG_VIEWS.map((v) => {
            const on = v === params.view;
            return (
              <Link
                key={v}
                href={hrefFor({ view: v, limit: PAGE }, params)}
                onClick={() => setOpen(false)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 text-[13px] no-underline transition-colors",
                  on ? "bg-hover font-medium text-ink" : "text-body hover:bg-hover hover:text-ink",
                )}
              >
                <span className="flex-1">{LABEL[v]}</span>
                <span className="font-mono text-[11px] tabular-nums text-faint">
                  {count(counts[v])}
                </span>
              </Link>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}
