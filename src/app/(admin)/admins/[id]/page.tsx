"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import type { AdminAccount } from "@/lib/api/types";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function AdminEditor({
  a,
  adminId,
  selfId,
}: {
  a: AdminAccount;
  adminId: string;
  selfId?: string;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(a.name);
  const [email, setEmail] = useState(a.email);
  const [password, setPassword] = useState("");

  const patchMut = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = { name, email };
      if (password) body.password = password;
      await adminClient.patch(`/admins/${adminId}`, body);
    },
    onSuccess: () => {
      toast.success("Сохранено");
      setPassword("");
      void qc.invalidateQueries({ queryKey: ["admin", adminId] });
      void qc.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const actMut = useMutation({
    mutationFn: async (path: string) => {
      await adminClient.post(`/admins/${adminId}/${path}`);
    },
    onSuccess: () => {
      toast.success("Готово");
      void qc.invalidateQueries({ queryKey: ["admin", adminId] });
      void qc.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-bg-secondary p-6">
          <Badge variant={a.is_active ? "success" : "danger"}>
            {a.is_active ? "Активен" : "Деактивирован"}
          </Badge>
          <div className="mt-4 space-y-3">
            <div>
              <Label>Имя</Label>
              <Input
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                className="mt-1"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Новый пароль</Label>
              <Input
                className="mt-1"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Оставьте пустым, если не меняете"
              />
            </div>
            <Button
              type="button"
              onClick={() => patchMut.mutate()}
              isLoading={patchMut.isPending}
            >
              Сохранить
            </Button>
          </div>
        </div>
        <div className="space-y-3 rounded-md border border-border bg-bg-secondary p-6">
          {a.is_active && adminId !== selfId ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => actMut.mutate("deactivate")}
              isLoading={actMut.isPending}
            >
              Деактивировать
            </Button>
          ) : null}
          {!a.is_active ? (
            <Button
              type="button"
              onClick={() => actMut.mutate("activate")}
              isLoading={actMut.isPending}
            >
              Активировать
            </Button>
          ) : null}
          {adminId === selfId ? (
            <p className="text-xs text-text-muted">
              Нельзя деактивировать свой аккаунт из этой панели.
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function AdminDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const selfId = useAuthStore((s) => s.admin?.id);

  const { data: a, isLoading } = useQuery({
    queryKey: ["admin", id],
    queryFn: async () => {
      const res = await adminClient.get<AdminAccount>(`/admins/${id}`);
      return res.data;
    },
  });

  if (isLoading || !a) {
    return <p className="text-sm text-text-secondary">Загрузка…</p>;
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Администраторы", href: "/admins" },
          { label: a.email },
        ]}
      />
      <AdminEditor
        key={`${a.id}-${a.updated_at}`}
        a={a}
        adminId={id}
        selfId={selfId}
      />
    </div>
  );
}
