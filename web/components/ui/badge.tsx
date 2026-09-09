import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** The uppercase mono eyebrow: source chips, recall class, section labels. */
const badgeVariants = cva(
  "inline-flex items-center font-mono text-[10.5px] font-medium uppercase tracking-[0.12em]",
  {
    variants: {
      variant: {
        outline: "border border-line-chip px-2 py-1 text-body",
        solidAlert: "bg-alert-fill px-2 py-1 text-paper",
        bare: "text-faint",
        alert: "text-alert",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
