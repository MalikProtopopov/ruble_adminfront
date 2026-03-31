"use client";

import { adminClient } from "@/lib/api/admin-client";
import { buildListParams } from "@/lib/api/pagination";
import type { LegalDocument, Paginated } from "@/lib/api/types";
import { documentStatusLabel } from "@/lib/status-i18n";
import { formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import type { ColumnDef } from "@tanstack/react-table";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useDeferredValue } from "react";

function statusVariant(
  s: LegalDocument["status"],
): "success" | "warning" | "danger" | "default" {
  if (s === "published") return "success";
  if (s === "draft") return "warning";
  if (s === "archived") return "danger";
  return "default";
}

const PAGE_SIZE = 25;

const columns: ColumnDef<LegalDocument>[] = [
  {
    accessorKey: "title",
    header: "Название",
    cell: ({ row }) => (
      <Link
        href={`/documents/${row.original.id}`}
        className="font-medium text-accent hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-text-secondary">
        {row.original.slug}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => (
      <Badge variant={statusVariant(row.original.status)}>
        {documentStatusLabel(row.original.status)}
      </Badge>
    ),
  },
  {
    accessorKey: "document_version",
    header: "Версия",
    cell: ({ row }) => (
      <span className="text-xs text-text-secondary">
        {row.original.document_version ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "document_date",
    header: "Дата документа",
    cell: ({ row }) => (
      <span className="text-xs text-text-secondary">
        {row.original.document_date
          ? formatDate(row.original.document_date)
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "file_url",
    header: "Файл",
    cell: ({ row }) =>
      row.original.file_url ? (
        <a
          href={row.original.file_url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-accent hover:underline"
        >
          Скачать
        </a>
      ) : (
        <span className="text-xs text-text-muted">—</span>
      ),
  },
  {
    accessorKey: "updated_at",
    header: "Обновлён",
    cell: ({ row }) => (
      <span className="text-xs text-text-secondary">
        {formatDate(row.original.updated_at)}
      </span>
    ),
  },
];

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<string>("");

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading } =
    useInfiniteQuery({
      queryKey: ["documents", deferredSearch, status],
      queryFn: async ({ pageParam }: { pageParam: string | null }) => {
        const qs = buildListParams({
          limit: PAGE_SIZE,
          cursor: pageParam,
          search: deferredSearch || undefined,
          status: status || undefined,
        });
        const res = await adminClient.get<Paginated<LegalDocument>>(
          `/documents${qs}`,
        );
        return res.data;
      },
      initialPageParam: null as string | null,
      getNextPageParam: (lp) =>
        lp.pagination.has_more ? lp.pagination.next_cursor : undefined,
    });

  const rows = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Документы" }]}
        onRefresh={() => void fetchNextPage()}
        isRefreshing={isFetching && !isLoading}
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Input
            className="w-64"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <SelectField
            className="w-48"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Все статусы</option>
            <option value="draft">Черновик</option>
            <option value="published">Опубликован</option>
            <option value="archived">Архив</option>
          </SelectField>
        </div>
        <Link href="/documents/new">
          <Button type="button">+ Создать документ</Button>
        </Link>
      </div>

      {isLoading ? null : rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Нет документов"
          description="Создайте первый документ"
        />
      ) : (
        <>
          <DataTable columns={columns} data={rows} />
          {hasNextPage && (
            <div className="mt-3 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => void fetchNextPage()}
                isLoading={isFetching}
              >
                Загрузить ещё
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
