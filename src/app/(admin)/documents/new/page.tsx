"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import type { LegalDocument } from "@/lib/api/types";
import { generateSlug } from "@/lib/utils/slugify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function NewDocumentPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [docVersion, setDocVersion] = useState("");
  const [docDate, setDocDate] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  function onTitleChange(val: string) {
    setTitle(val);
    if (!slugManual) {
      setSlug(generateSlug(val));
    }
  }

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await adminClient.post<LegalDocument>("/documents", {
        title,
        slug,
        excerpt: excerpt || undefined,
        content: content || undefined,
        status,
        document_version: docVersion || undefined,
        document_date: docDate || undefined,
        sort_order: Number(sortOrder) || 0,
      });
      return res.data;
    },
    onSuccess: (doc) => {
      toast.success("Документ создан");
      void qc.invalidateQueries({ queryKey: ["documents"] });
      router.push(`/documents/${doc.id}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Документы", href: "/documents" },
          { label: "Новый документ" },
        ]}
      />

      <div className="mt-4 max-w-4xl space-y-6">
        <div className="space-y-4 rounded-md border border-border bg-bg-secondary p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Название</Label>
              <Input
                className="mt-1"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Политика конфиденциальности"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                className="mt-1 font-mono"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManual(true);
                }}
                placeholder="privacy-policy"
              />
              <p className="mt-1 text-xs text-text-muted">
                Публичная ссылка: /d/{slug || "..."}
              </p>
            </div>
          </div>
          <div>
            <Label>Краткое описание</Label>
            <Textarea
              className="mt-1"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Краткое описание документа (до 500 символов)"
              rows={2}
            />
          </div>
          <div>
            <Label>Содержимое</Label>
            <div className="mt-1">
              <RichTextEditor value={content} onChange={setContent} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label>Статус</Label>
              <SelectField
                className="mt-1"
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
              >
                <option value="draft">Черновик</option>
                <option value="published">Опубликован</option>
              </SelectField>
            </div>
            <div>
              <Label>Версия документа</Label>
              <Input
                className="mt-1"
                value={docVersion}
                onChange={(e) => setDocVersion(e.target.value)}
                placeholder="1.0"
              />
            </div>
            <div>
              <Label>Дата документа</Label>
              <Input
                className="mt-1"
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Сортировка</Label>
              <Input
                className="mt-1"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => createMut.mutate()}
            isLoading={createMut.isPending}
            disabled={!title || !slug}
          >
            Создать документ
          </Button>
          <Button variant="secondary" onClick={() => router.push("/documents")}>
            Отмена
          </Button>
        </div>

        <p className="text-xs text-text-muted">
          Файл можно будет загрузить после создания документа.
        </p>
      </div>
    </div>
  );
}
