"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import { buildListParams } from "@/lib/api/pagination";
import type { AdminAccount, Paginated } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function AdminsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ["admins", activeFilter],
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
        const q = buildListParams({
          limit: 20,
          cursor: pageParam ?? undefined,
          is_active:
            activeFilter === "true"
              ? true
              : activeFilter === "false"
                ? false
                : undefined,
        });
        const res = await adminClient.get<Paginated<AdminAccount>>(
          `/admins${q}`,
        );
        return res.data;
      },
      getNextPageParam: (last) =>
        last.pagination.has_more ? last.pagination.next_cursor : undefined,
    });

  const rows = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const createMut = useMutation({
    mutationFn: async () => {
      await adminClient.post("/admins", { email, password, name: name || undefined });
    },
    onSuccess: () => {
      toast.success("Администратор создан");
      setModal(false);
      setEmail("");
      setPassword("");
      setName("");
      void qc.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns: ColumnDef<AdminAccount>[] = useMemo(
    () => [
      {
        header: "Email",
        cell: ({ row }) => (
          <Link
            href={`/admins/${row.original.id}`}
            className="text-accent hover:underline"
          >
            {row.original.email}
          </Link>
        ),
      },
      { header: "Имя", accessorKey: "name" },
      {
        header: "Статус",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "success" : "danger"}>
            {row.original.is_active ? "Активен" : "Выключен"}
          </Badge>
        ),
      },
      {
        header: "Обновлён",
        cell: ({ row }) => formatDateTime(row.original.updated_at),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Администраторы" }]}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching && !isLoading}
      />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label>Активность</Label>
          <SelectField
            className="mt-1 min-w-[160px]"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="">Все</option>
            <option value="true">Активные</option>
            <option value="false">Неактивные</option>
          </SelectField>
        </div>
        <Button type="button" onClick={() => setModal(true)}>
          + Создать администратора
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-text-secondary">Загрузка…</p>
      ) : (
        <>
          <DataTable data={rows} columns={columns} />
          {hasNextPage ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="secondary"
                type="button"
                isLoading={isFetching}
                onClick={() => void fetchNextPage()}
              >
                Загрузить ещё
              </Button>
            </div>
          ) : null}
        </>
      )}
      <Dialog
        open={modal}
        onClose={() => setModal(false)}
        title="Новый администратор"
      >
        <div className="space-y-3">
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
            <Label>Пароль</Label>
            <Input
              className="mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label>Имя</Label>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={() => createMut.mutate()}
            disabled={!email || !password}
            isLoading={createMut.isPending}
          >
            Создать
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
