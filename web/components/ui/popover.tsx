"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

/**
 * Designed popover, anchored to the control that opened it.
 *
 * Distinct from `Tooltip`, which is dark, hover-triggered and cannot hold
 * controls. This is a light panel in the card's own palette, opened by a
 * click, and it can contain buttons: Radix moves focus into it, traps Tab
 * inside, closes on Escape and on an outside click, and flips it when the
 * viewport edge is close.
 */
function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = "start",
  side = "top",
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            "z-50 w-[320px] rounded-card border border-line-strong bg-paper p-4",
            "shadow-[0_12px_40px_rgba(24,24,27,0.16)] outline-none",
            // keyframes live in app/globals.css; no animation plugin needed
            "radar-tooltip",
            className,
          )}
        >
          {children}
          {/*
            The tip, drawn by hand rather than by Radix's own arrow.

            Radix renders the arrow outside the panel, so the panel's border
            ran straight across the tip's mouth and the two read as a box with
            a separate triangle beneath it. Its `stroke` follows all three
            sides of the polygon, so outlining the tip redrew that same line.

            Two elements instead: a filled triangle, and an open path along
            only the two slanted sides. Pulled up by the border's own width, so
            the fill covers the line across the mouth while the outline still
            meets the panel's border at both corners.
          */}
          <PopoverPrimitive.Arrow asChild width={14} height={7}>
            <svg viewBox="0 0 14 7" className="-translate-y-px overflow-visible">
              <path d="M0 0 L14 0 L7 7 Z" className="fill-paper" />
              <path
                d="M0 0 L7 7 L14 0"
                fill="none"
                strokeWidth={1}
                className="stroke-line-strong"
              />
            </svg>
          </PopoverPrimitive.Arrow>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export { Popover };
