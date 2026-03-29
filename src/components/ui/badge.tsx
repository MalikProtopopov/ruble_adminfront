"use client";

import { cn } from "@/lib/utils/cn";

const variants: Record<string, string> = {
  default: "bg-bg-tertiary text-text-secondary",
  success: "bg-accent-muted text-accent",
  warning: "bg-warning-muted text-warning",
  danger: "bg-danger-muted text-danger",
  info: "bg-info-muted text-info",
  muted: "bg-bg-overlay text-text-muted",
};

export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: keyof typeof variants;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
