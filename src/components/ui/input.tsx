import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8 w-full rounded-md border border-[rgba(42,107,92,0.4)] bg-[#133c33] px-3 py-1 text-xs text-foreground font-mono shadow-[inset_2px_2px_5px_rgba(5,18,15,0.8),inset_-1px_-1px_4px_rgba(42,107,92,0.2)] transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-[#C49A45]/80 focus-visible:ring-1 focus-visible:ring-[#C49A45]/60 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
