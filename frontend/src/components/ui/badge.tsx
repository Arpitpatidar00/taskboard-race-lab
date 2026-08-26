import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-100 text-slate-800",
        todo: "border-transparent bg-slate-100 text-slate-700",
        in_progress: "border-transparent bg-amber-100 text-amber-800",
        done: "border-transparent bg-emerald-100 text-emerald-800",
        low: "border-transparent bg-sky-100 text-sky-700",
        medium: "border-transparent bg-orange-100 text-orange-700",
        high: "border-transparent bg-rose-100 text-rose-700",
        destructive: "border-transparent bg-red-100 text-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
