"use client";

import { adminClient } from "@/lib/api/admin-client";
import { buildListParams } from "@/lib/api/pagination";
import type { NotificationLog, Paginated } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import type { ColumnDef } from "@tanstack/react-table";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

export default function NotificationLogsPage() {
  const [status, setStatus] = useState("");

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ["notification-logs", status],
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
        const q = buildListParams({
          limit: 20,
          cursor: pageParam ?? undefined,
          status: status || undefined,
        });
        const res = await adminClient.get<Paginated<NotificationLog>>(
          `/logs/notification-logs${q}`,
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

  const columns: ColumnDef<NotificationLog>[] = useMemo(
    () => [
      { header: "Тип", accessorKey: "notification_type" },
      { header: "Заголовок", accessorKey: "title" },
      {
        header: "Статус",
        accessorKey: "status",
      },
      {
        header: "Время",
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Логи", href: "/logs/allocation" },
          { label: "Уведомления" },
        ]}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching && !isLoading}
      />
      <div className="mb-4">
        <select
          className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Все статусы</option>
          <option value="sent">sent</option>
          <option value="mock">mock</option>
          <option value="failed">failed</option>
        </select>
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
    </div>
  );
}
