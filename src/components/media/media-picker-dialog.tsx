"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import type { MediaAsset, MediaUploadKind, Paginated } from "@/lib/api/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Upload,
  FileVideo,
  FileText,
  Check,
  Search,
  Image as ImageIcon,
  AlertCircle,
  Music,
} from "lucide-react";
import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";

const AUDIO_MIMES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
]);

const SIZE_LIMITS: Record<MediaUploadKind, number> = {
  video: 500 * 1024 * 1024,
  document: 10 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mediaIcon(contentType: string) {
  if (contentType.startsWith("video/"))
    return <FileVideo className="size-5 text-info" />;
  if (contentType.startsWith("audio/"))
    return <Music className="size-5 text-accent" />;
  if (contentType.startsWith("image/"))
    return <ImageIcon className="size-5 text-accent" />;
  return <FileText className="size-5 text-warning" />;
}

function fileMatchesUploadKind(file: File, kind: MediaUploadKind): boolean {
  if (kind === "video") return file.type === "video/mp4";
  if (kind === "document") return file.type === "application/pdf";
  return AUDIO_MIMES.has(file.type);
}

function expectedKindLabel(kind: MediaUploadKind): string {
  if (kind === "video") return "видео (MP4)";
  if (kind === "document") return "документ (PDF)";
  return "аудио (MPEG, MP4, OGG, WebM)";
}

function uploadHint(kind: MediaUploadKind): string {
  if (kind === "video") return "Видео: MP4, до 500 МБ";
  if (kind === "document") return "Документ: PDF, до 10 МБ";
  return "Аудио: MPEG, MP4, OGG, WebM, до 50 МБ";
}

function validateFile(file: File, uploadType: MediaUploadKind): string | null {
  if (!fileMatchesUploadKind(file, uploadType)) {
    return `Неверный тип файла. Ожидается ${expectedKindLabel(uploadType)}`;
  }
  const maxSize = SIZE_LIMITS[uploadType];
  if (file.size > maxSize) {
    return `Файл слишком большой. Максимум ${formatBytes(maxSize)}`;
  }
  return null;
}

const PAGE_SIZE = 30;

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
  uploadType: MediaUploadKind;
  accept: string;
  title?: string;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["media-library", uploadType, debouncedSearch],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        type: uploadType,
      };
      if (pageParam) params.cursor = pageParam;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await adminClient.get<Paginated<MediaAsset>>("/media", {
        params,
      });
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? lastPage.pagination.next_cursor : undefined,
    enabled: open,
  });

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      setUploadError(null);

      const validationError = validateFile(file, uploadType);
      if (validationError) {
        setUploadError(validationError);
        toast.error(validationError);
        return;
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", uploadType);

      setUploading(true);
      setUploadProgress(0);
      setUploadFileName(file.name);

      try {
        const res = await adminClient.post<MediaAsset>("/media/upload", fd, {
          onUploadProgress(e) {
            if (e.total) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          },
        });
        toast.success("Файл загружен");
        await refetch();
        onSelect(res.data);
        onClose();
      } catch (err) {
        const msg = getErrorMessage(err);
        setUploadError(msg);
        toast.error(msg);
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

  function onScroll() {
    const el = listRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      void fetchNextPage();
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      className="w-[min(100%-2rem,640px)]"
      closeOnBackdrop={false}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={onFileChange}
      />

      <div
        className={`mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
          dragOver
            ? "border-accent bg-accent-muted"
            : "border-border hover:border-border-strong hover:bg-bg-tertiary"
        }`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {uploading ? (
          <>
            <span className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-text-primary">{uploadFileName}</p>
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-bg-tertiary">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="font-mono text-xs text-text-secondary">
              {uploadProgress}%
            </p>
          </>
        ) : uploadError ? (
          <>
            <AlertCircle className="size-5 text-danger" />
            <p className="text-sm text-danger">{uploadError}</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-1"
              onClick={(e) => {
                e.stopPropagation();
                setUploadError(null);
                inputRef.current?.click();
              }}
            >
              Попробовать снова
            </Button>
          </>
        ) : (
          <>
            <Upload className="size-5 text-text-secondary" />
            <p className="text-sm text-text-secondary">
              Перетащите файл или нажмите для загрузки
            </p>
            <p className="text-xs text-text-muted">{uploadHint(uploadType)}</p>
          </>
        )}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-2.5 size-4 text-text-muted" />
        <Input
          className="pl-9"
          placeholder="Поиск по имени файла..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div
        ref={listRef}
        className="max-h-[320px] overflow-y-auto"
        onScroll={onScroll}
      >
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md bg-bg-tertiary"
              />
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
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-bg-tertiary"
                onClick={() => selectExisting(m)}
              >
                {mediaIcon(m.content_type)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">
                    {m.filename}
                  </p>
                  <p className="font-mono text-xs text-text-muted">
                    {formatBytes(m.size_bytes)}
                    {m.content_type ? ` · ${m.content_type}` : ""}
                  </p>
                </div>
                <Check className="size-4 shrink-0 text-accent opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
            {isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <span className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            )}
            {hasNextPage && !isFetchingNextPage && (
              <button
                type="button"
                className="w-full py-2 text-center text-xs text-text-secondary hover:text-text-primary"
                onClick={() => void fetchNextPage()}
              >
                Загрузить ещё
              </button>
            )}
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
