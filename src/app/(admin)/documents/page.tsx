"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import { buildListParams } from "@/lib/api/pagination";
import type { LegalDocument, Paginated } from "@/lib/api/types";
import { documentStatusLabel } from "@/lib/status-i18n";
import { formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { FileText } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useDeferredValue } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

function statusVariant(
  s: LegalDocument["status"],
): "success" | "warning" | "danger" | "default" {
  if (s === "published") return "success";
  if (s === "draft") return "warning";
  if (s === "archived") return "danger";
  return "default";
}

const createSchema = z.object({
  title: z.string().min(1, "Обязательно"),
  slug: z
    .string()
    .min(1, "Обязательно")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Только латиница, цифры и дефисы"),
  content: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]),
  is_public: z.boolean(),
});

type CreateForm = z.infer<typeof createSchema>;

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
    accessorKey: "created_at",
    header: "Создан",
    cell: ({ row }) => (
      <span className="text-xs text-text-secondary">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
];

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<string>("");
  const [modal, setModal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", slug: "", content: "", status: "draft", is_public: true },
  });

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

  const createMut = useMutation({
    mutationFn: async (values: CreateForm) => {
      await adminClient.post("/documents", values);
    },
    onSuccess: () => {
      toast.success("Документ создан");
      reset();
      setModal(false);
      void qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function onSubmit(values: CreateForm) {
    createMut.mutate(values);
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Документы" }]}
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
        <Button onClick={() => setModal(true)}>+ Создать документ</Button>
      </div>

      {isLoading ? null : rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Нет документов"
          description="Создайте первый документ"
        />
      ) : (
        <DataTable columns={columns} data={rows} />
      )}

      <Dialog
        open={modal}
        onClose={() => setModal(false)}
        title="Новый документ"
        className="w-[min(100%-2rem,500px)]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Название</Label>
            <Input
              className="mt-1"
              {...register("title")}
              error={errors.title?.message}
            />
          </div>
          <div>
            <Label>Slug (URL)</Label>
            <Input
              className="mt-1"
              placeholder="privacy-policy"
              {...register("slug")}
              error={errors.slug?.message}
            />
            <p className="mt-1 text-xs text-text-muted">
              Латиница, цифры и дефисы. Будет использоваться в публичной ссылке.
            </p>
          </div>
          <div>
            <Label>Содержание</Label>
            <Textarea
              className="mt-1"
              rows={6}
              {...register("content")}
            />
          </div>
          <div>
            <Label>Статус</Label>
            <SelectField className="mt-1" {...register("status")}>
              <option value="draft">Черновик</option>
              <option value="published">Опубликован</option>
            </SelectField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModal(false)}
            >
              Отмена
            </Button>
            <Button type="submit" isLoading={createMut.isPending}>
              Создать
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
