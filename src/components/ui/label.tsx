"use client";

import { cn } from "@/lib/utils/cn";
import type { LabelHTMLAttributes } from "react";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1 block text-xs text-text-secondary", className)}
      {...props}
    />
  );
}
