"use client";

import { adminClient } from "@/lib/api/admin-client";
import type { AdminUserList, Paginated } from "@/lib/api/types";
import { buildListParams } from "@/lib/api/pagination";
import { formatKopecks } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import type { ColumnDef } from "@tanstack/react-table";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [role, setRole] = useState("");

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ["users", deferredSearch, role],
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
        const q = buildListParams({
          limit: 20,
          cursor: pageParam ?? undefined,
          search: deferredSearch || undefined,
          role: role || undefined,
        });
        const res = await adminClient.get<Paginated<AdminUserList>>(
          `/users${q}`,
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

  const columns: ColumnDef<AdminUserList>[] = useMemo(
    () => [
      {
        header: "Email",
        cell: ({ row }) => (
          <Link
            href={`/users/${row.original.id}`}
            className="text-accent hover:underline"
          >
            {row.original.email}
          </Link>
        ),
      },
      { header: "Имя", accessorKey: "name" },
      { header: "Роль", accessorKey: "role" },
      {
        header: "Статус",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "success" : "danger"}>
            {row.original.is_active ? "Активен" : "Деактивирован"}
          </Badge>
        ),
      },
      {
        header: "Всего пожертвований",
        cell: ({ row }) => formatKopecks(row.original.total_donated_kopecks),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Пользователи" }]}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching && !isLoading}
      />
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="min-w-[200px]">
          <Label>Поиск</Label>
          <Input
            className="mt-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email, имя..."
          />
        </div>
        <div className="min-w-[140px]">
          <Label>Роль</Label>
          <SelectField
            className="mt-1"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Все</option>
            <option value="donor">donor</option>
            <option value="patron">patron</option>
          </SelectField>
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-text-secondary">Загрузка…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="Нет пользователей" />
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
    </div>
  );
}
