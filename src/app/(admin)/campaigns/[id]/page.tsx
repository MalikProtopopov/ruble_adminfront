"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import { buildListParams } from "@/lib/api/pagination";
import type {
  Campaign,
  CampaignStats,
  OfflinePayment,
  Paginated,
} from "@/lib/api/types";
import { campaignStatusLabel } from "@/lib/status-i18n";
import { formatDateInput, formatKopecks, rublesToKopecks } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { ImageDropZone } from "@/components/media/image-drop-zone";
import { MediaUploadButton } from "@/components/media/media-upload-button";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Tab = "description" | "documents" | "thanks" | "offline" | "stats";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("description");
  const [closeNote, setCloseNote] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [thanksType, setThanksType] = useState<"video" | "audio">("video");
  const [thanksUrl, setThanksUrl] = useState("");
  const [thanksTitle, setThanksTitle] = useState("");

  const { data: c, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const res = await adminClient.get<Campaign>(`/campaigns/${id}`);
      return res.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["campaign-stats", id],
    queryFn: async () => {
      const res = await adminClient.get<CampaignStats>(
        `/stats/campaigns/${id}`,
      );
      return res.data;
    },
    enabled: tab === "stats",
  });

  const {
    data: offPages,
    fetchNextPage: fetchMoreOff,
    hasNextPage: hasMoreOff,
    isFetching: offFetching,
  } = useInfiniteQuery({
    queryKey: ["offline", id],
    initialPageParam: null as string | null,
    enabled: tab === "offline",
    queryFn: async ({ pageParam }) => {
      const q = buildListParams({
        limit: 20,
        cursor: pageParam ?? undefined,
      });
      const res = await adminClient.get<Paginated<OfflinePayment>>(
        `/campaigns/${id}/offline-payments${q}`,
      );
      return res.data;
    },
    getNextPageParam: (last) =>
      last.pagination.has_more ? last.pagination.next_cursor : undefined,
  });

  const offlineRows = useMemo(
    () => offPages?.pages.flatMap((p) => p.data) ?? [],
    [offPages],
  );

  const [draft, setDraft] = useState<Partial<Campaign>>({});

  useEffect(() => {
    if (c) {
      setDraft(c);
    }
  }, [c]);

  const dirty =
    c &&
    (draft.title !== c.title ||
      draft.description !== c.description ||
      draft.thumbnail_url !== c.thumbnail_url ||
      draft.video_url !== c.video_url ||
      draft.urgency_level !== c.urgency_level ||
      draft.sort_order !== c.sort_order ||
      draft.is_permanent !== c.is_permanent ||
      formatDateInput(draft.ends_at) !== formatDateInput(c.ends_at) ||
      draft.goal_amount !== c.goal_amount);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["campaign", id] });
    void qc.invalidateQueries({ queryKey: ["campaigns"] });
    void qc.invalidateQueries({ queryKey: ["campaign-stats", id] });
  };

  const patchMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await adminClient.patch<Campaign>(`/campaigns/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Сохранено");
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const actionMut = useMutation({
    mutationFn: async ({
      path,
      body,
    }: {
      path: string;
      body?: unknown;
    }) => {
      const res = await adminClient.post<Campaign>(
        `/campaigns/${id}/${path}`,
        body ?? {},
      );
      return res.data;
    },
    onSuccess: (_, v) => {
      toast.success("Готово");
      if (v.path === "close-early") setCloseOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const forceReallocMut = useMutation({
    mutationFn: async () => {
      const res = await adminClient.post<{ reallocated_subscriptions: number }>(
        `/campaigns/${id}/force-realloc`,
      );
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(`Перераспределено подписок: ${d.reallocated_subscriptions}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const addDocMut = useMutation({
    mutationFn: async () => {
      await adminClient.post(`/campaigns/${id}/documents`, {
        title: docTitle,
        file_url: docUrl,
        sort_order: 0,
      });
    },
    onSuccess: () => {
      toast.success("Документ добавлен");
      setDocTitle("");
      setDocUrl("");
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const delDocMut = useMutation({
    mutationFn: async (docId: string) => {
      await adminClient.delete(`/campaigns/${id}/documents/${docId}`);
    },
    onSuccess: () => {
      toast.success("Удалено");
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const addThanksMut = useMutation({
    mutationFn: async () => {
      await adminClient.post(`/campaigns/${id}/thanks`, {
        type: thanksType,
        media_url: thanksUrl,
        title: thanksTitle || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Добавлено");
      setThanksUrl("");
      setThanksTitle("");
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const delThanksMut = useMutation({
    mutationFn: async (tid: string) => {
      await adminClient.delete(`/campaigns/${id}/thanks/${tid}`);
    },
    onSuccess: () => {
      toast.success("Удалено");
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const [offAmount, setOffAmount] = useState("");
  const [offMethod, setOffMethod] = useState("bank_transfer");
  const [offDesc, setOffDesc] = useState("");
  const [offRef, setOffRef] = useState("");
  const [offDate, setOffDate] = useState("");

  const offMut = useMutation({
    mutationFn: async () => {
      await adminClient.post(`/campaigns/${id}/offline-payment`, {
        amount_kopecks: rublesToKopecks(offAmount),
        payment_method: offMethod,
        description: offDesc || undefined,
        external_reference: offRef || undefined,
        payment_date: offDate,
      });
    },
    onSuccess: () => {
      toast.success("Офлайн-платёж записан");
      setOfflineOpen(false);
      setOffAmount("");
      void qc.invalidateQueries({ queryKey: ["offline", id] });
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading || !c) {
    return <p className="text-sm text-text-secondary">Загрузка…</p>;
  }

  const pct =
    c.goal_amount && c.goal_amount > 0
      ? Math.min(100, Math.round((c.collected_amount / c.goal_amount) * 100))
      : 0;

  function saveDescription() {
    if (!c) return;
    const ends =
      draft.ends_at && !draft.is_permanent ? draft.ends_at : null;
    patchMut.mutate({
      title: draft.title,
      description: draft.description,
      thumbnail_url: draft.thumbnail_url,
      video_url: draft.video_url,
      urgency_level: draft.urgency_level,
      sort_order: draft.sort_order,
      is_permanent: draft.is_permanent,
      ends_at: ends,
      goal_amount: draft.is_permanent ? null : draft.goal_amount,
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "description", label: "Описание" },
    { id: "documents", label: "Документы" },
    { id: "thanks", label: "Благодарности" },
    { id: "offline", label: "Офлайн-платежи" },
    { id: "stats", label: "Статистика" },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Кампании", href: "/campaigns" },
          { label: c.title },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-bg-secondary p-6">
          <div className="mb-4 aspect-video max-w-md overflow-hidden rounded-md bg-bg-tertiary">
            {c.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.thumbnail_url}
                alt=""
                className="size-full object-cover"
              />
            ) : null}
          </div>
          <h1 className="font-mono text-xl font-semibold">{c.title}</h1>
          <p className="text-sm text-text-secondary">
            {c.foundation_name ?? "Фонд"}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Срочность: {"★".repeat(c.urgency_level || 0)}
            {"☆".repeat(5 - (c.urgency_level || 0))}
          </p>
          <div className="mt-4 font-mono text-sm">
            <p>
              Собрано: {formatKopecks(c.collected_amount)}
              {c.goal_amount != null
                ? ` · Цель: ${formatKopecks(c.goal_amount)}`
                : null}
            </p>
            {!c.is_permanent && c.goal_amount ? (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-tertiary">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${pct}%` }}
                />
              </div>
            ) : null}
            {c.donors_count != null ? (
              <p className="mt-2 text-text-secondary">
                Доноров: {c.donors_count}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-border bg-bg-secondary p-6">
          <div className="flex items-center gap-2">
            <Badge variant="default">{campaignStatusLabel(c.status)}</Badge>
            {c.closed_early ? (
              <Badge variant="warning">Досрочно закрыта</Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {c.status === "draft" ? (
              <Button
                type="button"
                onClick={() => actionMut.mutate({ path: "publish" })}
                isLoading={actionMut.isPending}
              >
                Опубликовать
              </Button>
            ) : null}
            {c.status === "active" ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => actionMut.mutate({ path: "pause" })}
                  isLoading={actionMut.isPending}
                >
                  Приостановить
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => actionMut.mutate({ path: "complete" })}
                  isLoading={actionMut.isPending}
                >
                  Завершить
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setCloseOpen(true)}
                >
                  Досрочно закрыть
                </Button>
              </>
            ) : null}
            {c.status === "paused" ? (
              <Button
                type="button"
                onClick={() =>
                  patchMut.mutate({ status: "active" } as Record<string, unknown>)
                }
                isLoading={patchMut.isPending}
              >
                Возобновить
              </Button>
            ) : null}
            {c.status === "completed" ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => actionMut.mutate({ path: "archive" })}
                isLoading={actionMut.isPending}
              >
                Архивировать
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              onClick={() => void forceReallocMut.mutateAsync()}
              isLoading={forceReallocMut.isPending}
            >
              Force Realloc
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOfflineOpen(true)}>
              Офлайн-платёж
            </Button>
          </div>
          <div>
            <Label>Сортировка</Label>
            <Input
              className="mt-1 max-w-[120px]"
              type="number"
              value={draft.sort_order ?? c.sort_order}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  sort_order: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-8 border-b border-border">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "border-b-2 border-accent px-3 py-2 text-sm text-accent"
                  : "px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {tab === "description" ? (
          <div className="max-w-2xl space-y-4">
            <div>
              <Label>Название</Label>
              <Input
                className="mt-1"
                value={draft.title ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea
                className="mt-1"
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!draft.is_permanent}
                id="perm2"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, is_permanent: e.target.checked }))
                }
              />
              <Label htmlFor="perm2" className="!mb-0">
                Бессрочный сбор
              </Label>
            </div>
            {!draft.is_permanent ? (
              <div>
                <Label>Целевая сумма (₽)</Label>
                <Input
                  className="mt-1 font-mono"
                  value={
                    draft.goal_amount != null
                      ? String(draft.goal_amount / 100)
                      : ""
                  }
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      goal_amount: rublesToKopecks(e.target.value),
                    }))
                  }
                />
              </div>
            ) : null}
            {!draft.is_permanent ? (
              <div>
                <Label>Дата завершения</Label>
                <Input
                  className="mt-1"
                  type="text"
                  placeholder="ГГГГ-ММ-ДД"
                  value={formatDateInput(draft.ends_at)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((d) => ({
                      ...d,
                      ends_at: v ? `${v}T23:59:59Z` : null,
                    }));
                  }}
                  onFocus={(e) => {
                    try { e.target.type = "date"; } catch {}
                  }}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = "text";
                  }}
                />
              </div>
            ) : null}
            <div>
              <Label>Превью</Label>
              <div className="mt-1">
                <ImageDropZone
                  value={draft.thumbnail_url ?? ""}
                  onChange={(url) =>
                    setDraft((d) => ({ ...d, thumbnail_url: url }))
                  }
                  label="Превью кампании"
                />
              </div>
            </div>
            <div>
              <Label>Видео URL</Label>
              <Input
                className="mt-1"
                placeholder="https://... или выберите из медиатеки"
                value={draft.video_url ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, video_url: e.target.value }))
                }
              />
              <div className="mt-2">
                <MediaUploadButton
                  uploadType="video"
                  accept="video/mp4"
                  label="Выбрать из медиатеки"
                  onUploaded={(url) =>
                    setDraft((d) => ({ ...d, video_url: url }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Срочность 1–5</Label>
              <Input
                className="mt-1 max-w-[100px]"
                type="number"
                min={1}
                max={5}
                value={draft.urgency_level ?? 3}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    urgency_level: Number(e.target.value),
                  }))
                }
              />
            </div>
            {dirty ? (
              <Button
                type="button"
                onClick={saveDescription}
                isLoading={patchMut.isPending}
              >
                Сохранить
              </Button>
            ) : null}
          </div>
        ) : null}

        {tab === "documents" ? (
          <div className="max-w-2xl space-y-4">
            <ul className="space-y-2">
              {(c.documents ?? []).map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-md border border-border bg-bg-secondary px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{d.title}</p>
                    <a
                      href={d.file_url}
                      className="text-xs text-accent hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {d.file_url}
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => delDocMut.mutate(d.id)}
                    isLoading={delDocMut.isPending}
                  >
                    Удалить
                  </Button>
                </li>
              ))}
            </ul>
            <div className="rounded-md border border-border p-4">
              <p className="mb-2 text-sm font-medium">Добавить документ</p>
              <Input
                className="mb-2"
                placeholder="Название"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />
              <Input
                className="mb-2"
                placeholder="URL файла (PDF)"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
              />
              <MediaUploadButton
                uploadType="document"
                accept="application/pdf"
                label="Загрузить PDF"
                onUploaded={(url) => setDocUrl(url)}
              />
              <Button
                type="button"
                className="mt-2"
                onClick={() => addDocMut.mutate()}
                disabled={!docTitle || !docUrl}
                isLoading={addDocMut.isPending}
              >
                Добавить
              </Button>
            </div>
          </div>
        ) : null}

        {tab === "thanks" ? (
          <div className="max-w-2xl space-y-4">
            <ul className="space-y-2">
              {(c.thanks_contents ?? []).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-md border border-border bg-bg-secondary px-3 py-2"
                >
                  <div>
                    <p className="text-sm">{t.title ?? t.type}</p>
                    <p className="text-xs text-text-muted">{t.media_url}</p>
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => delThanksMut.mutate(t.id)}
                    isLoading={delThanksMut.isPending}
                  >
                    Удалить
                  </Button>
                </li>
              ))}
            </ul>
            <div className="space-y-2 rounded-md border border-border p-4">
              <SelectField
                value={thanksType}
                onChange={(e) => {
                  setThanksType(e.target.value as "video" | "audio");
                  setThanksUrl("");
                }}
              >
                <option value="video">video</option>
                <option value="audio">audio</option>
              </SelectField>
              <Input
                placeholder="Заголовок"
                value={thanksTitle}
                onChange={(e) => setThanksTitle(e.target.value)}
              />
              <Input
                placeholder="URL медиа"
                value={thanksUrl}
                onChange={(e) => setThanksUrl(e.target.value)}
              />
              <MediaUploadButton
                uploadType={thanksType === "audio" ? "audio" : "video"}
                accept={
                  thanksType === "audio"
                    ? "audio/mpeg,audio/mp4,audio/ogg,audio/webm"
                    : "video/mp4"
                }
                label="Загрузить медиа"
                onUploaded={(url) => setThanksUrl(url)}
              />
              <Button
                type="button"
                onClick={() => addThanksMut.mutate()}
                disabled={!thanksUrl}
                isLoading={addThanksMut.isPending}
              >
                Добавить
              </Button>
            </div>
          </div>
        ) : null}

        {tab === "offline" ? (
          <div>
            <ul className="mb-4 space-y-2">
              {offlineRows.map((o) => (
                <li
                  key={o.id}
                  className="rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="font-mono">
                    {formatKopecks(o.amount_kopecks)}
                  </span>{" "}
                  · {o.payment_method} · {o.payment_date}
                  {o.description ? ` · ${o.description}` : null}
                </li>
              ))}
            </ul>
            {hasMoreOff ? (
              <Button
                variant="secondary"
                type="button"
                isLoading={offFetching}
                onClick={() => void fetchMoreOff()}
              >
                Загрузить ещё
              </Button>
            ) : null}
          </div>
        ) : null}

        {tab === "stats" && stats ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border p-4">
              <p className="text-xs text-text-secondary">Собрано</p>
              <p className="font-mono text-lg">
                {formatKopecks(stats.collected_amount)}
              </p>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="text-xs text-text-secondary">Доноры</p>
              <p className="font-mono text-lg">{stats.donors_count}</p>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="text-xs text-text-secondary">Средний чек</p>
              <p className="font-mono text-lg">
                {formatKopecks(stats.average_check_kopecks)}
              </p>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="text-xs text-text-secondary">Офлайн сумма</p>
              <p className="font-mono text-lg">
                {formatKopecks(stats.offline_payments_amount)}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Досрочное закрытие"
      >
        <Textarea
          placeholder="Комментарий для пользователей"
          value={closeNote}
          onChange={(e) => setCloseNote(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => setCloseOpen(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!closeNote.trim()}
            isLoading={actionMut.isPending}
            onClick={() =>
              actionMut.mutate({
                path: "close-early",
                body: { close_note: closeNote.trim() },
              })
            }
          >
            Закрыть
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={offlineOpen}
        onClose={() => setOfflineOpen(false)}
        title="Офлайн-платёж"
      >
        <div className="space-y-3">
          <div>
            <Label>Сумма (₽)</Label>
            <Input
              className="mt-1"
              value={offAmount}
              onChange={(e) => setOffAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Способ</Label>
            <SelectField
              className="mt-1"
              value={offMethod}
              onChange={(e) => setOffMethod(e.target.value)}
            >
              <option value="cash">cash</option>
              <option value="bank_transfer">bank_transfer</option>
              <option value="other">other</option>
            </SelectField>
          </div>
          <div>
            <Label>Описание</Label>
            <Input
              className="mt-1"
              value={offDesc}
              onChange={(e) => setOffDesc(e.target.value)}
            />
          </div>
          <div>
            <Label>Внешний референс</Label>
            <Input
              className="mt-1"
              value={offRef}
              onChange={(e) => setOffRef(e.target.value)}
            />
          </div>
          <div>
            <Label>Дата платежа</Label>
            <Input
              className="mt-1"
              type="date"
              value={offDate}
              onChange={(e) => setOffDate(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={() => offMut.mutate()}
            disabled={!offAmount || !offDate}
            isLoading={offMut.isPending}
          >
            Записать
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
