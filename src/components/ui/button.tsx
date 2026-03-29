"use client";

import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes } from "react";

export const buttonVariants = {
  primary:
    "bg-accent text-bg-primary hover:bg-accent-hover font-medium",
  secondary:
    "bg-bg-tertiary text-text-primary border border-border hover:bg-bg-overlay",
  ghost: "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary",
  danger: "bg-danger-muted text-danger hover:bg-danger/20 border border-danger/30",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  isLoading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  isLoading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none",
        buttonVariants[variant],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
