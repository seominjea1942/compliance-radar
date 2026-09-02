"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

/**
 * Designed tooltip, in place of the browser's native `title` bubble.
 *
 * Dark ink on the warm palette so it reads as an overlay rather than another
 * card. Radix handles the accessible part: it opens on focus as well as hover,
 * so the content is reachable from the keyboard and by screen readers.
 */
function Tooltip({
  content,
  children,
  side = "top",
  delayDuration = 150,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            collisionPadding={12}
            className={cn(
              "z-50 max-w-[264px] rounded-lg bg-ink px-3 py-2",
              "font-sans text-[12.5px]/relaxed text-shell shadow-lg",
              // keyframes live in app/globals.css; no animation plugin needed
              "radar-tooltip",
            )}
          >
            {content}
            <TooltipPrimitive.Arrow width={10} height={5} className="fill-ink" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export { Tooltip };
