"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage, getErrorCode } from "@/lib/api/errors";
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";
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

  const { data: doc, isLoading, refetch } = useQuery({
    queryKey: ["documents", id],
    queryFn: async () => {
      const res = await adminClient.get<LegalDocument>(`/documents/${id}`);
      return res.data;
    },
  });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<LegalDocument["status"]>("draft");
  const [docVersion, setDocVersion] = useState("");
  const [docDate, setDocDate] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setSlug(doc.slug);
      setExcerpt(doc.excerpt ?? "");
      setContent(doc.content ?? "");
      setStatus(doc.status);
      setDocVersion(doc.document_version ?? "");
      setDocDate(doc.document_date ?? "");
      setSortOrder(String(doc.sort_order));
      setDirty(false);
    }
  }, [doc]);

  function markDirty() {
    setDirty(true);
  }

  const patchMut = useMutation({
    mutationFn: async () => {
      if (!doc) return;
      const res = await adminClient.patch<LegalDocument>(`/documents/${id}`, {
        title,
        slug,
        excerpt: excerpt || null,
        content: content || null,
        status,
        document_version: docVersion || null,
        document_date: docDate || null,
        sort_order: Number(sortOrder) || 0,
        version: doc.version,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Сохранено");
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["documents", id] });
      void qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) => {
      if (getErrorCode(err) === "VERSION_CONFLICT") {
        toast.error("Документ был изменён другим пользователем. Перезагрузите страницу.");
      } else {
        toast.error(getErrorMessage(err));
      }
    },
  });

  const publishMut = useMutation({
    mutationFn: () => adminClient.post(`/documents/${id}/publish`),
    onSuccess: () => {
      toast.success("Опубликован");
      void refetch();
      void qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const unpublishMut = useMutation({
    mutationFn: () => adminClient.post(`/documents/${id}/unpublish`),
    onSuccess: () => {
      toast.success("Переведён в черновик");
      void refetch();
      void qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: () => adminClient.delete(`/documents/${id}`),
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
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  const deleteFileMut = useMutation({
    mutationFn: () => adminClient.delete(`/documents/${id}/file`),
    onSuccess: () => {
      toast.success("Файл удалён");
      void refetch();
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
      <PageHeader
        breadcrumbs={[
          { label: "Документы", href: "/documents" },
          { label: doc.title },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(doc.status)}>
          {documentStatusLabel(doc.status)}
        </Badge>
        {doc.document_version && (
          <span className="text-xs text-text-muted">v{doc.document_version}</span>
        )}
        <Link
          href={`/d/${doc.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-tertiary"
        >
          <ExternalLink className="size-3" />
          Публичная ссылка
        </Link>
        {doc.status === "draft" || doc.status === "archived" ? (
          <Button
            variant="secondary"
            className="text-xs"
            onClick={() => publishMut.mutate()}
            isLoading={publishMut.isPending}
          >
            Опубликовать
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="text-xs"
            onClick={() => unpublishMut.mutate()}
            isLoading={unpublishMut.isPending}
          >
            В черновик
          </Button>
        )}
        <Button
          variant="danger"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="max-w-4xl space-y-6">
        <div className="space-y-4 rounded-md border border-border bg-bg-secondary p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Название</Label>
              <Input
                className="mt-1"
                value={title}
                onChange={(e) => { setTitle(e.target.value); markDirty(); }}
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                className="mt-1 font-mono"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); markDirty(); }}
              />
              <p className="mt-1 text-xs text-text-muted">
                Публичная ссылка: /d/{slug}
              </p>
            </div>
          </div>
          <div>
            <Label>Краткое описание</Label>
            <Textarea
              className="mt-1"
              value={excerpt}
              onChange={(e) => { setExcerpt(e.target.value); markDirty(); }}
              rows={2}
            />
          </div>
          <div>
            <Label>Содержимое</Label>
            <div className="mt-1">
              <RichTextEditor
                value={content}
                onChange={(val) => { setContent(val); markDirty(); }}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label>Статус</Label>
              <SelectField
                className="mt-1"
                value={status}
                onChange={(e) => { setStatus(e.target.value as LegalDocument["status"]); markDirty(); }}
              >
                <option value="draft">Черновик</option>
                <option value="published">Опубликован</option>
                <option value="archived">Архив</option>
              </SelectField>
            </div>
            <div>
              <Label>Версия документа</Label>
              <Input
                className="mt-1"
                value={docVersion}
                onChange={(e) => { setDocVersion(e.target.value); markDirty(); }}
                placeholder="1.0"
              />
            </div>
            <div>
              <Label>Дата документа</Label>
              <Input
                className="mt-1"
                type="date"
                value={docDate}
                onChange={(e) => { setDocDate(e.target.value); markDirty(); }}
              />
            </div>
            <div>
              <Label>Сортировка</Label>
              <Input
                className="mt-1"
                type="number"
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value); markDirty(); }}
              />
            </div>
          </div>
          {dirty && (
            <Button
              onClick={() => patchMut.mutate()}
              isLoading={patchMut.isPending}
            >
              Сохранить
            </Button>
          )}
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
              PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV — до 50 МБ
            </p>
          </div>
        </div>

        <div className="text-xs text-text-muted">
          <p>Создан: {formatDateTime(doc.created_at)}</p>
          <p>Обновлён: {formatDateTime(doc.updated_at)}</p>
          {doc.published_at && <p>Опубликован: {formatDateTime(doc.published_at)}</p>}
          <p>Версия записи: {doc.version}</p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Удалить документ?"
        description={`Документ «${doc.title}» будет удалён.`}
        confirmLabel="Удалить"
        onConfirm={() => deleteMut.mutate()}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
