import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4">
      <p className="font-mono text-6xl font-bold text-accent">404</p>
      <h1 className="mt-4 text-xl font-semibold text-text-primary">
        Страница не найдена
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Запрашиваемая страница не существует или была удалена.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-hover"
        >
          На главную
        </Link>
        <Link
          href="/d"
          className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
        >
          Документы
        </Link>
      </div>
    </div>
  );
}
