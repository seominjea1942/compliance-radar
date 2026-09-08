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
  "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-control transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-brand-deep",
        outline: "border border-line-card bg-paper text-ink hover:bg-hover",
        ghost: "text-muted hover:bg-hover hover:text-brand",
        link: "text-brand underline-offset-4 hover:underline",
        cardAction:
          "flex-none tracking-[0.02em] text-muted hover:bg-brand-wash hover:text-brand",
      },
      size: {
        default: "h-9 px-4 text-sm",
        sm: "h-8 px-3 text-[13px]",
        // 12px, not 10.5. The card action row is the only place in the app
        // that went under 11, and these are the controls the whole card is
        // there to offer.
        action: "px-2.5 py-[7px] text-[12px] font-normal",
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
