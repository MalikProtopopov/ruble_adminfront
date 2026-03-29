"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (useAuthStore.getState().accessToken) {
        if (!cancelled) setState("ok");
        return;
      }
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error("no session");
        const data = (await res.json()) as { access_token: string };
        useAuthStore.getState().setAccessToken(data.access_token);
        if (!cancelled) setState("ok");
      } catch {
        if (!cancelled) {
          setState("fail");
          router.replace("/login");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen flex-col gap-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-3xl" />
      </div>
    );
  }

  if (state === "fail") {
    return null;
  }

  return <>{children}</>;
}
