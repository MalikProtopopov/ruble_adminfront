"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import type { UserDetail } from "@/lib/api/types";
import { formatDateTime, formatKopecks } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export default function UserDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const qc = useQueryClient();

  const { data: u, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await adminClient.get<UserDetail>(`/users/${id}`);
      return res.data;
    },
  });

  const act = useMutation({
    mutationFn: async (path: string) => {
      const res = await adminClient.post(`/users/${id}/${path}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Готово");
      void qc.invalidateQueries({ queryKey: ["user", id] });
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading || !u) {
    return <p className="text-sm text-text-secondary">Загрузка…</p>;
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Пользователи", href: "/users" },
          { label: u.email },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-bg-secondary p-6">
          <h1 className="font-mono text-xl">{u.name}</h1>
          <p className="text-text-secondary">{u.email}</p>
          <p className="mt-2 text-sm">Роль: {u.role}</p>
          <Badge
            className="mt-2"
            variant={u.is_active ? "success" : "danger"}
          >
            {u.is_active ? "Активен" : "Деактивирован"}
          </Badge>
          <p className="mt-4 font-mono text-sm">
            Всего: {formatKopecks(u.total_donated_kopecks)} · Донатов:{" "}
            {u.total_donations_count} · Стрик: {u.current_streak_days} дн.
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Регистрация: {formatDateTime(u.created_at)}
          </p>
        </div>
        <div className="space-y-3 rounded-md border border-border bg-bg-secondary p-6">
          {u.role === "donor" ? (
            <Button
              type="button"
              onClick={() => act.mutate("grant-patron")}
              isLoading={act.isPending}
            >
              Назначить мецената
            </Button>
          ) : null}
          {u.role === "patron" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => act.mutate("revoke-patron")}
              isLoading={act.isPending}
            >
              Отозвать мецената
            </Button>
          ) : null}
          {u.is_active ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => act.mutate("deactivate")}
              isLoading={act.isPending}
            >
              Деактивировать
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => act.mutate("activate")}
              isLoading={act.isPending}
            >
              Активировать
            </Button>
          )}
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 font-mono text-sm text-text-secondary">
            Подписки
          </h2>
          <ul className="space-y-2 text-sm">
            {u.subscriptions.map((s) => (
              <li key={s.id} className="rounded border border-border p-2">
                {formatKopecks(s.amount_kopecks)} / {s.billing_period} ·{" "}
                {s.status}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-mono text-sm text-text-secondary">
            Недавние донаты
          </h2>
          <ul className="space-y-2 text-sm">
            {u.recent_donations.map((d) => (
              <li key={d.id} className="rounded border border-border p-2">
                {d.campaign_title} · {formatKopecks(d.amount_kopecks)} ·{" "}
                {d.status}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
