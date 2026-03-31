export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <span className="font-mono text-sm font-semibold text-accent">
            По Рублю
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
