import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn Button, with the design's own variants.
 *
 * `cardAction` is the quiet row of controls under a surfaced item (Done,
 * Share via email, …). It exists here so the hover treatment is defined once
 * rather than on every button.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-green-deep",
        outline: "border border-line-card bg-paper text-ink hover:bg-hover",
        ghost: "text-muted hover:bg-hover hover:text-green",
        link: "text-green underline-offset-4 hover:underline",
        cardAction:
          "flex-none tracking-[0.02em] text-muted hover:bg-hover hover:text-green",
      },
      size: {
        default: "h-9 px-4 text-sm",
        sm: "h-8 px-3 text-[13px]",
        action: "px-[9px] py-[7px] text-[10.5px] font-normal",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
