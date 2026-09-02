import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Initials-only avatar. `square` is the store tile in the rail header,
 * `round` is the signed-in owner.
 */
function Avatar({
  name,
  shape = "round",
  className,
  ...props
}: React.ComponentProps<"div"> & { name: string; shape?: "round" | "square" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, shape === "square" ? 2 : 1)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <div
      data-slot="avatar"
      aria-hidden
      className={cn(
        "flex flex-none items-center justify-center font-sans",
        shape === "square" &&
          "size-8 rounded-[7px] border border-line-strong bg-line text-xs font-semibold text-muted",
        shape === "round" &&
          "size-[30px] rounded-full bg-green text-xs font-medium text-shell",
        className,
      )}
      {...props}
    >
      {initials}
    </div>
  );
}

export { Avatar };
