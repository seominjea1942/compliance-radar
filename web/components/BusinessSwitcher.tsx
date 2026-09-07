"use client";

import { useState } from "react";
import { MdCheck, MdUnfoldMore } from "react-icons/md";
import { Avatar } from "@/components/ui/avatar";
import { Popover } from "@/components/ui/popover";

/**
 * The rail's business switcher.
 *
 * It has always looked like a menu trigger and opened nothing, which is worse
 * than not being there: the affordance promised a list. It now opens one, and
 * the list is honest about its length. Willow Glen is the only business the
 * radar watches, and adding a second is out of scope, so the panel says that
 * in as many words rather than showing an empty state that reads like a bug.
 */
export function BusinessSwitcher({
  storeName,
  location,
  compact = false,
}: {
  storeName: string;
  location?: string | null;
  /**
   * Avatar only, for the header, where the store's name would compete with
   * the sections for the middle of the bar. The panel it opens is unchanged
   * and still names the business in full.
   */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side="bottom"
      className="w-[268px] p-1.5"
      align={compact ? "end" : "start"}
      trigger={
        compact ? (
          <button
            type="button"
            aria-label={`Switch business. Current: ${storeName}`}
            className="group flex size-10 flex-none cursor-pointer items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {/* The avatar is the whole target, so the hover lands on its own
                border rather than on a background it would cover. */}
            <Avatar
              name={storeName}
              shape="square"
              className="size-10 rounded-full text-[13px] transition-colors group-hover:border-ghost group-data-[state=open]:border-ghost"
            />
          </button>
        ) : (
          <button
            type="button"
            aria-label={`Switch business. Current: ${storeName}`}
            className="flex max-w-[200px] flex-none cursor-pointer items-center gap-2.5 rounded-[10px] border border-line-card bg-paper px-[11px] py-2.5 text-left transition-colors hover:border-line-strong hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=open]:border-line-strong data-[state=open]:bg-hover md:max-w-none"
          >
            <Avatar name={storeName} shape="square" />
            <div className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-[13px]/tight font-semibold">{storeName}</span>
              {location && <span className="truncate text-[11.5px] text-faint">{location}</span>}
            </div>
            <MdUnfoldMore className="ml-auto size-4 flex-none text-ghost" aria-hidden />
          </button>
        )
      }
    >
      <div className="flex flex-col gap-1">
        <span className="px-2 pt-1.5 pb-1 font-mono text-[10px] tracking-[0.1em] text-ghost uppercase">
          Watching
        </span>

        {/*
          The current business, as a selected row rather than a control: there
          is nothing to switch to, so a button here would do nothing on click.
        */}
        <div className="flex items-center gap-2.5 rounded-[9px] bg-hover px-2 py-2">
          <Avatar name={storeName} shape="square" />
          {/*
            No truncation here, unlike the rail trigger: the panel exists to
            name the business, so a long name wraps rather than losing its
            tail to an ellipsis.
          */}
          <div className="flex min-w-0 flex-col gap-px">
            <span className="text-[13px]/tight font-semibold text-balance text-ink">
              {storeName}
            </span>
            {location && <span className="text-[11.5px] text-faint">{location}</span>}
          </div>
          <MdCheck className="ml-auto size-4 flex-none text-green" aria-hidden />
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 border-t border-line px-2 pt-2.5 pb-1">
          <span className="text-[12px] text-faint">Add a business</span>
          <span className="font-mono text-[10px] tracking-[0.1em] text-ghost uppercase">Soon</span>
        </div>
        <p className="m-0 px-2 pb-1.5 text-[11.5px]/relaxed text-ghost">
          One store for this build. Watching a second would mean a second profile, and the radar
          reads the profile to decide what is worth your attention.
        </p>
      </div>
    </Popover>
  );
}
