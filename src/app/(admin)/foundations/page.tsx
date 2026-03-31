"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import { buildListParams } from "@/lib/api/pagination";
import type { Foundation, Paginated } from "@/lib/api/types";
import { foundationStatusLabel } from "@/lib/status-i18n";
import { formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageDropZone } from "@/components/media/image-drop-zone";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { useDeferredValue } from "react";

function statusVariant(
  s: Foundation["status"],
): "success" | "warning" | "danger" | "default" {
  if (s === "active") return "success";
  if (s === "pending_verification") return "warning";
  if (s === "suspended") return "danger";
  return "default";
}

const createSchema = z.object({
  name: z.string().min(1, "Обязательно"),
  legal_name: z.string().min(1, "Обязательно"),
  inn: z
    .string()
    .min(1, "Обязательно")
    .regex(/^\d+$/, "Только цифры")
    .max(12),
  description: z.string().max(2000).optional(),
  website_url: z
    .string()
    .optional()
    .refine((s) => !s || /^https?:\/\//.test(s), "Некорректный URL"),
  logo_url: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export default function FoundationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<string>("");
  const [modal, setModal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", legal_name: "", inn: "", description: "" },
  });

  const logoUrl = watch("logo_url");

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ["foundations", deferredSearch, status],
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
        const q = buildListParams({
          limit: 20,
          cursor: pageParam ?? undefined,
          search: deferredSearch || undefined,
          status: status || undefined,
        });
        const res = await adminClient.get<Paginated<Foundation>>(
          `/foundations${q}`,
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
    mutationFn: async (body: CreateForm) => {
      const res = await adminClient.post<Foundation>("/foundations", {
        ...body,
        website_url: body.website_url || undefined,
        logo_url: body.logo_url || undefined,
        description: body.description || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Фонд создан");
      setModal(false);
      reset();
      void qc.invalidateQueries({ queryKey: ["foundations"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns: ColumnDef<Foundation>[] = useMemo(
    () => [
      {
        header: "Название",
        cell: ({ row }) => (
          <Link
            href={`/foundations/${row.original.id}`}
            className="font-medium text-accent hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      { header: "ИНН", accessorKey: "inn" },
      {
        header: "Статус",
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {foundationStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        header: "Обновлён",
        cell: ({ row }) => formatDate(row.original.updated_at),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Фонды" }]}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching && !isLoading}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px]">
            <Label>Поиск</Label>
            <Input
              className="mt-1"
              placeholder="Название, ИНН..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-[160px]">
            <Label>Статус</Label>
            <SelectField
              className="mt-1"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Все</option>
              <option value="active">Активен</option>
              <option value="pending_verification">На проверке</option>
              <option value="suspended">Заморожен</option>
            </SelectField>
          </div>
        </div>
        <Button type="button" onClick={() => setModal(true)}>
          + Создать фонд
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary">Загрузка…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Нет фондов"
          description="Создайте первый фонд для запуска платформы"
          action={
            <Button type="button" onClick={() => setModal(true)}>
              + Создать фонд
            </Button>
          }
        />
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

      <Dialog open={modal} onClose={() => setModal(false)} title="Создать фонд">
        <form
          onSubmit={handleSubmit((v) => createMut.mutate(v))}
          className="space-y-4"
        >
          <div>
            <Label>Публичное название *</Label>
            <Input className="mt-1" {...register("name")} error={errors.name?.message} />
          </div>
          <div>
            <Label>Юридическое название *</Label>
            <Input
              className="mt-1"
              {...register("legal_name")}
              error={errors.legal_name?.message}
            />
          </div>
          <div>
            <Label>ИНН *</Label>
            <Input
              className="mt-1"
              maxLength={12}
              inputMode="numeric"
              {...register("inn")}
              error={errors.inn?.message}
            />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea className="mt-1" {...register("description")} />
          </div>
          <div>
            <Label>Сайт</Label>
            <Input
              className="mt-1"
              placeholder="https://"
              {...register("website_url")}
              error={errors.website_url?.message}
            />
          </div>
          <div>
            <Label>Логотип</Label>
            <div className="mt-1">
              <ImageDropZone
                value={logoUrl ?? ""}
                onChange={(url) => setValue("logo_url", url)}
                label="Логотип фонда"
              />
            </div>
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
              Создать фонд
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
