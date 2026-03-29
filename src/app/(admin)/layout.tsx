import { AdminAuthGate } from "@/components/layout/admin-auth-gate";
import { Sidebar } from "@/components/layout/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGate>
      <div className="min-h-screen bg-bg-primary">
        <Sidebar />
        <div className="pl-[240px]">
          <div className="min-h-screen px-8 py-6">{children}</div>
        </div>
      </div>
    </AdminAuthGate>
  );
}
