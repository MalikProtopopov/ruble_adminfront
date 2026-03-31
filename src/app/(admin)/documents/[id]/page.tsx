"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import type { LegalDocument } from "@/lib/api/types";
import { documentStatusLabel } from "@/lib/status-i18n";
import { formatDateTime } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const FILE_ACCEPT =
  "application/pdf,.docx,.xlsx,.pptx,.txt,.csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function statusVariant(
  s: LegalDocument["status"],
): "success" | "warning" | "danger" | "default" {
  if (s === "published") return "success";
  if (s === "draft") return "warning";
  if (s === "archived") return "danger";
  return "default";
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: doc, isLoading } = useQuery({
    queryKey: ["documents", id],
    queryFn: async () => {
      const res = await adminClient.get<LegalDocument>(`/documents/${id}`);
      return res.data;
    },
  });

  const [draft, setDraft] = useState<Partial<LegalDocument>>({});
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (doc) {
      setDraft({
        title: doc.title,
        slug: doc.slug,
        content: doc.content ?? "",
        status: doc.status,
        is_public: doc.is_public,
      });
      setDirty(false);
    }
  }, [doc]);

  function update(patch: Partial<LegalDocument>) {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  }

  const patchMut = useMutation({
    mutationFn: async () => {
      await adminClient.patch(`/documents/${id}`, draft);
    },
    onSuccess: () => {
      toast.success("Сохранено");
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["documents", id] });
      void qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      await adminClient.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      toast.success("Документ удалён");
      void qc.invalidateQueries({ queryKey: ["documents"] });
      router.push("/documents");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  async function uploadFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Файл слишком большой. Максимум 50 МБ");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    setUploadProgress(0);
    try {
      await adminClient.post(`/documents/${id}/file`, fd, {
        onUploadProgress(e) {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      toast.success("Файл загружен");
      void qc.invalidateQueries({ queryKey: ["documents", id] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  const deleteFileMut = useMutation({
    mutationFn: async () => {
      await adminClient.delete(`/documents/${id}/file`);
    },
    onSuccess: () => {
      toast.success("Файл удалён");
      void qc.invalidateQueries({ queryKey: ["documents", id] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-bg-tertiary" />
        ))}
      </div>
    );
  }

  if (!doc) {
    return <p className="text-text-muted">Документ не найден</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/documents"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="size-4" />
          Документы
        </Link>
      </div>

      <PageHeader
        breadcrumbs={[
          { label: "Документы", href: "/documents" },
          { label: doc.title },
        ]}
      />

      <div className="mb-6 flex items-center gap-2">
        <Badge variant={statusVariant(doc.status)}>
          {documentStatusLabel(doc.status)}
        </Badge>
        <Link
          href={`/d/${doc.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-tertiary"
        >
          <ExternalLink className="size-3" />
          Публичная ссылка
        </Link>
        <Button
          variant="danger"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="mt-6 grid max-w-3xl gap-6">
        <div className="space-y-4 rounded-md border border-border bg-bg-secondary p-6">
          <div>
            <Label>Название</Label>
            <Input
              className="mt-1"
              value={draft.title ?? ""}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>
          <div>
            <Label>Slug</Label>
            <Input
              className="mt-1"
              value={draft.slug ?? ""}
              onChange={(e) => update({ slug: e.target.value })}
            />
            <p className="mt-1 text-xs text-text-muted">
              Публичная ссылка: /d/{draft.slug || "..."}
            </p>
          </div>
          <div>
            <Label>Содержание</Label>
            <Textarea
              className="mt-1 min-h-[200px]"
              value={draft.content ?? ""}
              onChange={(e) => update({ content: e.target.value })}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Статус</Label>
              <SelectField
                className="mt-1"
                value={draft.status ?? doc.status}
                onChange={(e) =>
                  update({ status: e.target.value as LegalDocument["status"] })
                }
              >
                <option value="draft">Черновик</option>
                <option value="published">Опубликован</option>
                <option value="archived">Архив</option>
              </SelectField>
            </div>
            <div className="flex-1">
              <Label>Публичный доступ</Label>
              <SelectField
                className="mt-1"
                value={draft.is_public ? "true" : "false"}
                onChange={(e) =>
                  update({ is_public: e.target.value === "true" })
                }
              >
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </SelectField>
            </div>
          </div>
          {dirty ? (
            <Button
              type="button"
              onClick={() => patchMut.mutate()}
              isLoading={patchMut.isPending}
            >
              Сохранить
            </Button>
          ) : null}
        </div>

        <div className="space-y-4 rounded-md border border-border bg-bg-secondary p-6">
          <h3 className="text-sm font-medium">Прикреплённый файл</h3>
          {doc.file_url ? (
            <div className="flex items-center gap-3 rounded-md border border-border bg-bg-primary p-3">
              <a
                href={doc.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 truncate text-sm text-accent hover:underline"
              >
                {doc.file_url}
              </a>
              <Button
                variant="danger"
                className="text-xs"
                onClick={() => deleteFileMut.mutate()}
                isLoading={deleteFileMut.isPending}
              >
                Удалить файл
              </Button>
            </div>
          ) : (
            <p className="text-sm text-text-muted">Файл не прикреплён</p>
          )}

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={FILE_ACCEPT}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void uploadFile(f);
            }}
          />
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              isLoading={uploading}
            >
              <Upload className="mr-1 size-4" />
              {doc.file_url ? "Заменить файл" : "Загрузить файл"}
            </Button>
            {uploading && (
              <div className="mt-2">
                <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-bg-tertiary">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-1 font-mono text-xs text-text-secondary">
                  {uploadProgress}%
                </p>
              </div>
            )}
            <p className="mt-2 text-xs text-text-muted">
              PDF, DOCX, XLSX, PPTX, TXT, CSV — до 50 МБ
            </p>
          </div>
        </div>

        <div className="text-xs text-text-muted">
          <p>Создан: {formatDateTime(doc.created_at)}</p>
          <p>Обновлён: {formatDateTime(doc.updated_at)}</p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Удалить документ?"
        description={`Документ «${doc.title}» будет удалён безвозвратно.`}
        confirmLabel="Удалить"
        onConfirm={() => deleteMut.mutate()}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
