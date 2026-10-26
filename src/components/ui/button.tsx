import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary: "bg-wine text-ivory hover:bg-[#58101e] shadow-sm",
        gold: "bg-gold text-night hover:bg-[#ddba77] shadow-[0_4px_16px_-2px_rgba(233,201,138,0.45)] font-semibold",
        secondary:
          "bg-surface-container text-primary hover:bg-surface-container-high shadow-sm",
        outline:
          "border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container",
        ghost: "hover:bg-surface-container text-on-surface hover:text-primary",
        destructive: "bg-error text-on-error hover:bg-[#a01616] shadow-sm",
        subtle: "bg-night/40 text-ivory hover:bg-night/60 backdrop-blur-sm",
      },
      size: {
        default: "min-h-[44px] px-4 py-2.5",
        sm: "min-h-[36px] px-3 py-1.5 text-xs rounded-lg",
        lg: "min-h-[48px] px-6 py-3 text-base rounded-xl",
        icon: "h-11 w-11 p-0 rounded-xl",
        iconSm: "h-9 w-9 p-0 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
