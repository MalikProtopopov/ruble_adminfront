import { Suspense } from "react";

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-sm text-text-secondary">Загрузка…</p>
      }
    >
      {children}
    </Suspense>
  );
}
