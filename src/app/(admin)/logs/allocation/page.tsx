"use client";

import { adminClient } from "@/lib/api/admin-client";
import { buildListParams } from "@/lib/api/pagination";
import type { AllocationLog, Paginated } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import type { ColumnDef } from "@tanstack/react-table";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

export default function AllocationLogsPage() {
  const [reason, setReason] = useState("");

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ["allocation-logs", reason],
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
        const q = buildListParams({
          limit: 20,
          cursor: pageParam ?? undefined,
          reason: reason || undefined,
        });
        const res = await adminClient.get<Paginated<AllocationLog>>(
          `/logs/allocation-logs${q}`,
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

  const columns: ColumnDef<AllocationLog>[] = useMemo(
    () => [
      {
        header: "Из",
        cell: ({ row }) => row.original.from_campaign_title ?? "—",
      },
      {
        header: "В",
        cell: ({ row }) => row.original.to_campaign_title ?? "—",
      },
      { header: "Причина", accessorKey: "reason" },
      {
        header: "Создано",
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
          { label: "Реаллокации" },
        ]}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching && !isLoading}
      />
      <div className="mb-4">
        <select
          className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="">Все причины</option>
          <option value="campaign_completed">campaign_completed</option>
          <option value="campaign_closed_early">campaign_closed_early</option>
          <option value="no_campaigns_in_foundation">
            no_campaigns_in_foundation
          </option>
          <option value="no_campaigns_on_platform">
            no_campaigns_on_platform
          </option>
          <option value="manual_by_admin">manual_by_admin</option>
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
