import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-red-500/10 text-red-400 border-red-500/20",
        secondary: "border-transparent bg-neutral-800 text-neutral-300",
        destructive: "border-transparent bg-red-900 text-red-300",
        outline: "border-neutral-700 text-neutral-300",
        success:
          "border-transparent bg-green-500/10 text-green-400 border-green-500/20",
        warning:
          "border-transparent bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
