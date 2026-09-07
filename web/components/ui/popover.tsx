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
          <PopoverPrimitive.Arrow
            width={12}
            height={6}
            className="fill-paper stroke-line-strong"
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export { Popover };
