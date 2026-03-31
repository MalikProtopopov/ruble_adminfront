"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4">
      <p className="font-mono text-6xl font-bold text-danger">500</p>
      <h1 className="mt-4 text-xl font-semibold text-text-primary">
        Что-то пошло не так
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Произошла непредвиденная ошибка. Попробуйте обновить страницу.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-hover"
        >
          Попробовать снова
        </button>
        <a
          href="/"
          className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
        >
          На главную
        </a>
      </div>
    </div>
  );
}
