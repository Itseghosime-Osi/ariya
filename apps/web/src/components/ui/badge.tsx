import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-wine focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-ivory",
        confirmed: "bg-success-surface text-success",
        awaiting: "bg-secondary-container text-on-secondary-container",
        declined: "bg-surface-container text-on-surface-variant",
        gold: "bg-secondary-fixed text-on-secondary-fixed",
        wine: "bg-wine text-ivory",
        outline: "border border-outline-variant text-on-surface",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
