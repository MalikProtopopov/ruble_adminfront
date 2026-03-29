"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import type { MediaAsset, Paginated } from "@/lib/api/types";
import { useQuery } from "@tanstack/react-query";
import {
  Upload,
  FileVideo,
  FileText,
  Check,
  Search,
  Image as ImageIcon,
} from "lucide-react";
import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mediaIcon(contentType: string) {
  if (contentType.startsWith("video/")) return <FileVideo className="size-5 text-info" />;
  if (contentType.startsWith("image/")) return <ImageIcon className="size-5 text-accent" />;
  return <FileText className="size-5 text-warning" />;
}

export function MediaPickerDialog({
  open,
  onClose,
  onSelect,
  uploadType,
  accept,
  title = "Выбрать медиа",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  uploadType: "video" | "document";
  accept: string;
  title?: string;
}) {
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["media-library", uploadType],
    queryFn: async () => {
      const res = await adminClient.get<Paginated<MediaAsset>>("/media", {
        params: { limit: 100 },
      });
      return res.data.data;
    },
    enabled: open,
  });

  const items = (data ?? []).filter((m) => {
    if (!search) return true;
    return m.filename.toLowerCase().includes(search.toLowerCase());
  });

  const uploadFile = useCallback(
    async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", uploadType);
      setUploading(true);
      try {
        const res = await adminClient.post<MediaAsset>("/media/upload", fd);
        toast.success("Файл загружен");
        await refetch();
        onSelect(res.data);
        onClose();
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setUploading(false);
      }
    },
    [uploadType, refetch, onSelect, onClose],
  );

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  function selectExisting(asset: MediaAsset) {
    onSelect(asset);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} className="w-[min(100%-2rem,640px)]">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={onFileChange}
      />

      {/* Upload zone */}
      <div
        className={`mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
          dragOver
            ? "border-accent bg-accent-muted"
            : "border-border hover:border-border-strong hover:bg-bg-tertiary"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {uploading ? (
          <span className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        ) : (
          <Upload className="size-5 text-text-secondary" />
        )}
        <p className="text-sm text-text-secondary">
          {uploading ? "Загрузка..." : "Перетащите файл или нажмите для загрузки"}
        </p>
        <p className="text-xs text-text-muted">
          {uploadType === "video" ? "MP4, до 500 МБ" : "PDF, до 10 МБ"}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-2.5 size-4 text-text-muted" />
        <Input
          className="pl-9"
          placeholder="Поиск по имени файла..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Media list */}
      <div className="max-h-[320px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-bg-tertiary" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            {search ? "Ничего не найдено" : "Нет загруженных файлов"}
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-bg-tertiary"
                onClick={() => selectExisting(m)}
              >
                {mediaIcon(m.content_type)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">{m.filename}</p>
                  <p className="font-mono text-xs text-text-muted">
                    {formatBytes(m.size_bytes)}
                    {m.content_type ? ` · ${m.content_type}` : ""}
                  </p>
                </div>
                <Check className="size-4 shrink-0 text-transparent group-hover:text-accent" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end border-t border-border pt-3">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </Dialog>
  );
}
