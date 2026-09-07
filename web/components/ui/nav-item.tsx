import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "flex flex-none items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 text-[13.5px] whitespace-nowrap no-underline transition-colors";

/**
 * A row in the left rail.
 *
 * `soon` marks a section that is not built. It renders as plain text rather
 * than a link, so the row reads as deliberately out of scope instead of
 * offering a click that goes nowhere.
 */
function NavItem({
  label,
  meta,
  active = false,
  soon = false,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  label: string;
  meta?: React.ReactNode;
  active?: boolean;
  soon?: boolean;
}) {
  if (soon) {
    return (
      <span
        data-slot="nav-item"
        aria-disabled="true"
        className={cn(base, "cursor-default font-normal text-ghost select-none", className)}
      >
        <span className="whitespace-nowrap">{label}</span>
        <span className="font-mono text-[10px] tracking-[0.1em] text-ghost uppercase">Soon</span>
      </span>
    );
  }

  return (
    <a
      data-slot="nav-item"
      data-active={active || undefined}
      className={cn(
        base,
        active
          ? "border border-line-card bg-paper px-[11px] font-medium text-ink shadow-[0_1px_2px_rgba(24,24,27,0.04)]"
          : "font-normal text-muted hover:bg-hover hover:text-ink",
        className,
      )}
      {...props}
    >
      <span className="whitespace-nowrap">{label}</span>
      {meta !== undefined && (
        // text-muted, not text-monoink: these counts sit on the bare
        // canvas, whose tint drifts, and #71717a is marginal there even
        // before it moves. Measured at 4.45:1 at one end of the drift.
        <span className="font-mono text-[11px] font-medium text-muted">{meta}</span>
      )}
    </a>
  );
}

export { NavItem };
