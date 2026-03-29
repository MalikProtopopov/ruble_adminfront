"use client";

import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cn(
        "fixed inset-0 m-auto max-h-[90vh] w-[min(100%-2rem,520px)] overflow-hidden rounded-lg border border-border bg-bg-overlay p-0 text-text-primary shadow-xl backdrop:bg-black/60",
        className,
      )}
      onClose={onClose}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === ref.current) onClose();
      }}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-mono text-sm font-semibold tracking-tight">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
          aria-label="Закрыть"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="max-h-[calc(90vh-52px)] overflow-y-auto p-4">{children}</div>
    </dialog>
  );
}
