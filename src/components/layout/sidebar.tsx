"use client";

import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Button } from "@/components/ui/button";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Trophy,
  Users,
  Wallet,
  ScrollText,
  Bell,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const nav = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/foundations", label: "Фонды", icon: Building2 },
  { href: "/campaigns", label: "Кампании", icon: Megaphone },
  { href: "/users", label: "Пользователи", icon: Users },
  { href: "/payouts", label: "Выплаты", icon: Wallet },
  { href: "/achievements", label: "Достижения", icon: Trophy },
];

const logs = [
  { href: "/logs/allocation", label: "Логи реаллокаций", icon: ScrollText },
  { href: "/logs/notifications", label: "Логи уведомлений", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = useAuthStore((s) => s.admin);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    useAuthStore.getState().logoutLocal();
    router.replace("/login");
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-border bg-bg-secondary">
      <div className="border-b border-border px-4 py-4">
        <Link href="/" className="font-mono text-sm font-semibold text-accent">
          По Рублю Admin
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-150",
              isActive(href)
                ? "border-l-2 border-accent bg-accent-muted text-accent"
                : "border-l-2 border-transparent text-text-secondary hover:bg-bg-tertiary",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
        <div className="my-2 border-t border-border" />
        {logs.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-150",
              isActive(href)
                ? "border-l-2 border-accent bg-accent-muted text-accent"
                : "border-l-2 border-transparent text-text-secondary hover:bg-bg-tertiary",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
        <div className="my-2 border-t border-border" />
        <Link
          href="/admins"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-150",
            isActive("/admins")
              ? "border-l-2 border-accent bg-accent-muted text-accent"
              : "border-l-2 border-transparent text-text-secondary hover:bg-bg-tertiary",
          )}
        >
          <Shield className="size-4 shrink-0" />
          Администраторы
        </Link>
      </nav>
      <div className="border-t border-border p-3">
        <div className="mb-2 truncate text-xs text-text-secondary">
          <p className="truncate font-medium text-text-primary">
            {admin?.name ?? "—"}
          </p>
          <p className="truncate">{admin?.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start !px-2 text-text-secondary"
          onClick={() => void handleLogout()}
        >
          <LogOut className="size-4" />
          Выйти
        </Button>
      </div>
    </aside>
  );
}
