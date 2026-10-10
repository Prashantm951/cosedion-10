import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "neo-btn-primary shadow-[2px_2px_6px_rgba(5,18,15,0.7),-2px_-2px_5px_rgba(196,154,69,0.3)] active:shadow-[inset_2px_2px_4px_rgba(60,40,5,0.7)] text-brand-pine font-semibold",
        destructive:
          "bg-[#802222] text-white border border-[#a83232]/60 shadow-[2px_2px_6px_rgba(5,18,15,0.7)] hover:bg-[#962828] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7)]",
        outline: "neo-btn border border-[rgba(42,107,92,0.5)] text-foreground hover:text-white",
        secondary: "neo-btn border border-[rgba(42,107,92,0.4)] text-foreground hover:text-white",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-surface/60 rounded-md transition-colors",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "neo-btn-primary rounded-lg font-bold shadow-[3px_3px_10px_rgba(5,18,15,0.8),-2px_-2px_8px_rgba(196,154,69,0.4)]",
        tactical:
          "bg-[#133c33] border border-[#2A6B5C]/50 text-foreground shadow-[inset_1px_1px_3px_rgba(5,18,15,0.8)] hover:border-[#C49A45]/60 hover:text-[#C49A45]",
      },
      size: {
        default: "h-8 px-3 py-1 text-xs",
        sm: "h-7 px-2.5 py-0.5 text-[11px]",
        lg: "h-9 px-4 py-1.5 text-sm",
        icon: "h-7 w-7 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
