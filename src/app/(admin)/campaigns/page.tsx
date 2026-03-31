"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import { buildListParams } from "@/lib/api/pagination";
import type { Campaign, Foundation, Paginated } from "@/lib/api/types";
import { campaignStatusLabel } from "@/lib/status-i18n";
import { formatKopecks } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
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
import { ImageDropZone } from "@/components/media/image-drop-zone";
import { MediaUploadButton } from "@/components/media/media-upload-button";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

function campaignBadgeVariant(
  s: Campaign["status"],
): "success" | "warning" | "danger" | "info" | "muted" | "default" {
  switch (s) {
    case "active":
      return "success";
    case "paused":
      return "warning";
    case "completed":
      return "info";
    case "archived":
      return "muted";
    default:
      return "default";
  }
}

function ProgressCell({ row }: { row: Campaign }) {
  if (row.is_permanent || row.goal_amount == null) {
    return <span className="text-text-muted">Бессрочный</span>;
  }
  const pct = Math.min(
    100,
    Math.round((row.collected_amount / row.goal_amount) * 100),
  );
  const barColor =
    pct >= 100
      ? "bg-info"
      : pct >= 80
        ? "bg-warning"
        : "bg-accent";
  return (
    <div className="min-w-[120px]">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 font-mono text-xs text-text-secondary">
        {formatKopecks(row.collected_amount)} / {formatKopecks(row.goal_amount)}
      </p>
    </div>
  );
}

const step1Schema = z.object({
  foundation_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().max(5000).optional(),
  goal_rubles: z.string().optional(),
  is_permanent: z.boolean(),
  ends_at: z.string().optional(),
  urgency_level: z
    .union([z.string(), z.number()])
    .transform((x) => Number(x))
    .pipe(z.number().min(1).max(5)),
  sort_order: z
    .union([z.string(), z.number()])
    .transform((x) => Number(x))
    .pipe(z.number().int()),
});

type Step1 = z.output<typeof step1Schema>;

export default function CampaignsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const foundationFilter = searchParams.get("foundation_id") ?? "";
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState("");
  const [foundationId, setFoundationId] = useState(foundationFilter);
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [thumbUrl, setThumbUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const { data: foundationsData } = useQuery({
    queryKey: ["foundations", "short"],
    queryFn: async () => {
      const res = await adminClient.get<Paginated<Foundation>>(
        `/foundations${buildListParams({ limit: 100 })}`,
      );
      return res.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      foundation_id: foundationFilter || "",
      title: "",
      description: "",
      goal_rubles: "",
      is_permanent: false,
      ends_at: "",
      urgency_level: 3,
      sort_order: 0,
    },
  });

  const isPermanent = watch("is_permanent");

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ["campaigns", deferredSearch, status, foundationId],
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
        const q = buildListParams({
          limit: 20,
          cursor: pageParam ?? undefined,
          search: deferredSearch || undefined,
          status: status || undefined,
          foundation_id: foundationId || undefined,
        });
        const res = await adminClient.get<Paginated<Campaign>>(
          `/campaigns${q}`,
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
    mutationFn: async (payload: {
      foundation_id: string;
      title: string;
      description?: string;
      goal_amount: number | null;
      is_permanent: boolean;
      ends_at: string | null;
      urgency_level: number;
      sort_order: number;
      thumbnail_url?: string;
      video_url?: string;
    }) => {
      const res = await adminClient.post<Campaign>("/campaigns", payload);
      return res.data;
    },
    onSuccess: (c) => {
      toast.success("Кампания создана (черновик)");
      setModal(false);
      setStep(1);
      reset();
      setThumbUrl("");
      setVideoUrl("");
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
      router.push(`/campaigns/${c.id}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function onStep1(values: Step1) {
    setStep(2);
    // store in closure via ref or state - simpler: submit both steps on step2
    (window as unknown as { __c1?: Step1 }).__c1 = values;
  }

  function finishCreate() {
    const values = (window as unknown as { __c1?: Step1 }).__c1;
    if (!values) return;
    const goal =
      values.is_permanent || !values.goal_rubles?.trim()
        ? null
        : Math.round(
            parseFloat(values.goal_rubles.replace(",", ".").replace(/\s/g, "")) *
              100,
          );
    if (!values.is_permanent) {
      if (goal === null || goal <= 0 || Number.isNaN(goal)) {
        toast.error("Укажите корректную цель в рублях");
        return;
      }
    }
    createMut.mutate({
      foundation_id: values.foundation_id,
      title: values.title,
      description: values.description || undefined,
      goal_amount: goal,
      is_permanent: values.is_permanent,
      ends_at: values.ends_at ? `${values.ends_at}T23:59:59Z` : null,
      urgency_level: values.urgency_level,
      sort_order: values.sort_order,
      thumbnail_url: thumbUrl || undefined,
      video_url: videoUrl || undefined,
    });
  }

  const columns: ColumnDef<Campaign>[] = useMemo(
    () => [
      {
        header: "Название",
        cell: ({ row }) => (
          <Link
            className="font-medium text-accent hover:underline"
            href={`/campaigns/${row.original.id}`}
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        header: "Фонд",
        cell: ({ row }) => row.original.foundation_name ?? "—",
      },
      {
        header: "Статус",
        cell: ({ row }) => (
          <Badge variant={campaignBadgeVariant(row.original.status)}>
            {campaignStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        header: "Прогресс",
        cell: ({ row }) => <ProgressCell row={row.original} />,
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Кампании" }]}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching && !isLoading}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[180px]">
            <Label>Поиск</Label>
            <Input
              className="mt-1"
              placeholder="Название..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-[140px]">
            <Label>Статус</Label>
            <SelectField
              className="mt-1"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Все</option>
              <option value="draft">Черновик</option>
              <option value="active">Активна</option>
              <option value="paused">Пауза</option>
              <option value="completed">Завершена</option>
              <option value="archived">Архив</option>
            </SelectField>
          </div>
          <div className="min-w-[200px]">
            <Label>Фонд</Label>
            <SelectField
              className="mt-1"
              value={foundationId}
              onChange={(e) => setFoundationId(e.target.value)}
            >
              <option value="">Все фонды</option>
              {foundationsData?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => {
            setStep(1);
            setModal(true);
          }}
        >
          + Создать кампанию
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary">Загрузка…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Нет кампаний"
          description="Создайте кампанию в черновике и опубликуйте её"
          action={
            <Button type="button" onClick={() => setModal(true)}>
              + Создать кампанию
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

      <Dialog
        open={modal}
        onClose={() => {
          setModal(false);
          setStep(1);
        }}
        title={step === 1 ? "Новая кампания (1/2)" : "Новая кампания (2/2)"}
      >
        {step === 1 ? (
          <form
            onSubmit={handleSubmit(onStep1)}
            className="space-y-4"
          >
            <div>
              <Label>Фонд *</Label>
              <SelectField className="mt-1" {...register("foundation_id")}>
                <option value="">Выберите фонд</option>
                {foundationsData?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </SelectField>
              {errors.foundation_id ? (
                <p className="mt-1 text-xs text-danger">
                  {errors.foundation_id.message}
                </p>
              ) : null}
            </div>
            <div>
              <Label>Название *</Label>
              <Input className="mt-1" {...register("title")} />
              {errors.title ? (
                <p className="mt-1 text-xs text-danger">{errors.title.message}</p>
              ) : null}
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea className="mt-1" {...register("description")} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register("is_permanent")} id="perm" />
              <Label htmlFor="perm" className="!mb-0">
                Бессрочный сбор
              </Label>
            </div>
            {!isPermanent ? (
              <>
                <div>
                  <Label>Целевая сумма (₽)</Label>
                  <Input className="mt-1" {...register("goal_rubles")} />
                </div>
                <div>
                  <Label>Дата окончания</Label>
                  <Input className="mt-1" type="date" {...register("ends_at")} />
                </div>
              </>
            ) : null}
            <div>
              <Label>Срочность (1–5)</Label>
              <Input
                className="mt-1"
                type="number"
                min={1}
                max={5}
                {...register("urgency_level")}
              />
            </div>
            <div>
              <Label>Порядок сортировки</Label>
              <Input className="mt-1" type="number" {...register("sort_order")} />
            </div>
            <p className="text-xs text-text-muted">
              Кампания создаётся в черновике. Опубликуйте её для показа
              пользователям.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModal(false)}
              >
                Отмена
              </Button>
              <Button type="submit">Далее →</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Превью (изображение)</Label>
              <div className="mt-1">
                <ImageDropZone
                  value={thumbUrl}
                  onChange={setThumbUrl}
                  label="Превью кампании"
                />
              </div>
            </div>
            <div>
              <Label>Видео кампании</Label>
              <Input
                className="mt-1"
                placeholder="https://... или загрузите mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <div className="mt-2">
                <MediaUploadButton
                  uploadType="video"
                  accept="video/mp4"
                  label="Загрузить mp4"
                  onUploaded={(url) => setVideoUrl(url)}
                />
              </div>
            </div>
            <div className="flex justify-between gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                ← Назад
              </Button>
              <Button
                type="button"
                onClick={() => finishCreate()}
                isLoading={createMut.isPending}
              >
                Создать кампанию
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
