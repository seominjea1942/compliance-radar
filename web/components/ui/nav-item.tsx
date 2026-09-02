import * as React from "react";
import { cn } from "@/lib/utils";

/** A row in the left rail. `active` is the current section. */
function NavItem({
  label,
  meta,
  active = false,
  className,
  ...props
}: React.ComponentProps<"a"> & { label: string; meta?: React.ReactNode; active?: boolean }) {
  return (
    <a
      data-slot="nav-item"
      data-active={active || undefined}
      className={cn(
        "flex items-center justify-between rounded-control px-3 py-2.5 text-[13.5px] no-underline transition-colors",
        active
          ? "border border-line-card bg-paper px-[11px] font-medium text-ink"
          : "font-normal text-muted hover:bg-hover hover:text-ink",
        className,
      )}
      {...props}
    >
      <span className="whitespace-nowrap">{label}</span>
      {meta !== undefined && (
        <span className="font-mono text-[11px] font-medium text-monoink">{meta}</span>
      )}
    </a>
  );
}

export { NavItem };
