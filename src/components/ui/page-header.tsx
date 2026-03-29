"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export function PageHeader({
  breadcrumbs,
  onRefresh,
  isRefreshing,
}: {
  breadcrumbs: { label: string; href?: string }[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <header className="mb-6 flex h-[52px] shrink-0 items-center justify-between border-b border-border">
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        {breadcrumbs.map((b, i) => (
          <span key={`${b.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? (
              <span className="text-text-muted" aria-hidden>
                /
              </span>
            ) : null}
            {b.href ? (
              <Link
                href={b.href}
                className="text-text-secondary hover:text-accent transition-colors duration-150"
              >
                {b.label}
              </Link>
            ) : (
              <span className="font-medium text-text-primary">{b.label}</span>
            )}
          </span>
        ))}
      </nav>
      {onRefresh ? (
        <Button
          variant="ghost"
          className="!p-2"
          onClick={onRefresh}
          isLoading={isRefreshing}
          aria-label="Обновить"
        >
          {!isRefreshing ? <RefreshCw className="size-4" /> : null}
        </Button>
      ) : null}
    </header>
  );
}
