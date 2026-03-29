"use client";

import { cn } from "@/lib/utils/cn";
import type { SelectHTMLAttributes } from "react";

export function SelectField({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none transition-all duration-150 focus:border-border-strong",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
