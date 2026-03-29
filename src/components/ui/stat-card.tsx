export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-secondary p-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-text-primary">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}
