"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import type { Foundation, FoundationStatus } from "@/lib/api/types";
import { foundationStatusLabel } from "@/lib/status-i18n";
import { formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { MediaUploadButton } from "@/components/media/media-upload-button";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function FoundationEditor({
  f,
  foundationId,
}: {
  f: Foundation;
  foundationId: string;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Foundation>>(() => ({ ...f }));
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const dirty =
    draft.name !== f.name ||
    draft.legal_name !== f.legal_name ||
    draft.description !== f.description ||
    draft.logo_url !== f.logo_url ||
    draft.website_url !== f.website_url ||
    draft.status !== f.status ||
    draft.yookassa_shop_id !== f.yookassa_shop_id;

  const patchMut = useMutation({
    mutationFn: async (body: Partial<Foundation>) => {
      const res = await adminClient.patch<Foundation>(
        `/foundations/${foundationId}`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success("Сохранено");
      void qc.invalidateQueries({ queryKey: ["foundation", foundationId] });
      void qc.invalidateQueries({ queryKey: ["foundations"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function submitPatch() {
    patchMut.mutate({
      name: draft.name,
      legal_name: draft.legal_name,
      description: draft.description ?? null,
      logo_url: draft.logo_url ?? null,
      website_url: draft.website_url ?? null,
      status: draft.status,
      yookassa_shop_id: draft.yookassa_shop_id ?? null,
    });
    setConfirmSuspend(false);
  }

  function save() {
    const nextStatus = draft.status;
    if (nextStatus === "suspended" && f.status !== "suspended") {
      setConfirmSuspend(true);
      return;
    }
    submitPatch();
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-bg-secondary p-6">
          <div className="mb-4 flex gap-4">
            <div className="flex size-20 items-center justify-center rounded-md bg-bg-tertiary text-xl font-mono text-accent">
              {f.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.logo_url}
                  alt=""
                  className="size-full rounded-md object-cover"
                />
              ) : (
                f.name.slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="font-mono text-xl font-semibold">{f.name}</h1>
              <p className="text-sm text-text-secondary">{f.legal_name}</p>
              <p className="mt-1 font-mono text-xs text-text-muted">
                ИНН: {f.inn}
              </p>
              {f.verified_at ? (
                <p className="mt-1 text-xs text-text-secondary">
                  Верифицирован: {formatDate(f.verified_at)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Публичное название</Label>
              <Input
                className="mt-1"
                value={draft.name ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Юридическое название</Label>
              <Input
                className="mt-1"
                value={draft.legal_name ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, legal_name: e.target.value }))
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
            <div>
              <Label>Сайт</Label>
              <Input
                className="mt-1"
                value={draft.website_url ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, website_url: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Логотип</Label>
              <Input
                className="mt-1"
                placeholder="https://... или выберите из медиатеки"
                value={draft.logo_url ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, logo_url: e.target.value }))
                }
              />
              <div className="mt-2">
                <MediaUploadButton
                  uploadType="document"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  label="Выбрать из медиатеки"
                  onUploaded={(url) =>
                    setDraft((d) => ({ ...d, logo_url: url }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-md border border-border bg-bg-secondary p-6">
          <div>
            <Label>Статус</Label>
            <SelectField
              className="mt-1"
              value={draft.status ?? f.status}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  status: e.target.value as FoundationStatus,
                }))
              }
            >
              <option value="pending_verification">
                {foundationStatusLabel("pending_verification")}
              </option>
              <option value="active">{foundationStatusLabel("active")}</option>
              <option value="suspended">
                {foundationStatusLabel("suspended")}
              </option>
            </SelectField>
          </div>
          <div>
            <Label>ID магазина YooKassa</Label>
            <Input
              className="mt-1"
              value={draft.yookassa_shop_id ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  yookassa_shop_id: e.target.value || null,
                }))
              }
            />
          </div>
          <Badge variant="default">
            Текущий: {foundationStatusLabel(f.status)}
          </Badge>
          {dirty ? (
            <Button
              type="button"
              onClick={save}
              isLoading={patchMut.isPending}
            >
              Сохранить изменения
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 font-mono text-sm font-semibold text-text-secondary">
          Кампании фонда
        </h2>
        <Link
          href={`/campaigns?foundation_id=${f.id}`}
          className="text-sm text-accent hover:underline"
        >
          Открыть список кампаний с фильтром
        </Link>
      </div>

      <ConfirmDialog
        open={confirmSuspend}
        onClose={() => setConfirmSuspend(false)}
        onConfirm={() => submitPatch()}
        title="Заморозить фонд"
        description="Все кампании фонда исчезнут из публичной ленты."
        confirmLabel="Заморозить"
        isLoading={patchMut.isPending}
      />
    </>
  );
}

export default function FoundationDetailPage() {
  const params = useParams();
  const id = String(params.id);

  const { data: f, isLoading } = useQuery({
    queryKey: ["foundation", id],
    queryFn: async () => {
      const res = await adminClient.get<Foundation>(`/foundations/${id}`);
      return res.data;
    },
  });

  if (isLoading || !f) {
    return <p className="text-sm text-text-secondary">Загрузка…</p>;
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Фонды", href: "/foundations" },
          { label: f.name },
        ]}
      />
      <FoundationEditor
        key={`${f.id}-${f.updated_at}`}
        f={f}
        foundationId={id}
      />
    </div>
  );
}
