import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[rgba(125,193,40,0.12)] text-[#7DC128] border-[rgba(125,193,40,0.2)]",
        secondary: "bg-[#182219] text-[#a8b3aa] border-[#28342a]",
        destructive: "bg-[rgba(216,90,74,0.12)] text-[#d85a4a] border-[rgba(216,90,74,0.2)]",
        outline: "border-[#28342a] text-[#a8b3aa]",
        success:
          "bg-[rgba(125,193,40,0.12)] text-[#7DC128] border-[rgba(125,193,40,0.2)]",
        warning:
          "bg-[rgba(232,167,58,0.12)] text-[#e8a73a] border-[rgba(232,167,58,0.2)]",
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
