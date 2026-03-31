"use client";

import { adminClient } from "@/lib/api/admin-client";
import { getErrorMessage } from "@/lib/api/errors";
import type { MediaAsset } from "@/lib/api/types";
import { MediaPickerDialog } from "./media-picker-dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon, AlertCircle } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
const IMAGE_MIMES = new Set(IMAGE_ACCEPT.split(","));
const MAX_SIZE = 10 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageDropZone({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!IMAGE_MIMES.has(file.type)) {
        const msg = "Неверный тип файла. Ожидается изображение (PNG, JPEG, WebP, SVG)";
        setError(msg);
        toast.error(msg);
        return;
      }
      if (file.size > MAX_SIZE) {
        const msg = `Файл слишком большой. Максимум ${formatBytes(MAX_SIZE)}`;
        setError(msg);
        toast.error(msg);
        return;
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "image");

      setUploading(true);
      setUploadProgress(0);

      try {
        const res = await adminClient.post<MediaAsset>("/media/upload", fd, {
          onUploadProgress(e) {
            if (e.total) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          },
        });
        toast.success("Изображение загружено");
        onChange(res.data.url);
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    },
    [onChange],
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

  if (value) {
    return (
      <>
        <div className="group relative inline-block rounded-lg border border-border bg-bg-secondary p-2">
          <img
            src={value}
            alt={label ?? "Превью"}
            className="max-h-40 max-w-full rounded object-contain"
          />
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => setPickerOpen(true)}
            >
              Заменить
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-xs"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-1 size-3" />
              Загрузить
            </Button>
            <button
              type="button"
              className="ml-auto rounded p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-danger"
              onClick={() => onChange("")}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={IMAGE_ACCEPT}
          onChange={onFileChange}
        />
        <MediaPickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          uploadType="image"
          accept={IMAGE_ACCEPT}
          title="Выбрать изображение"
          onSelect={(asset) => onChange(asset.url)}
        />
      </>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={IMAGE_ACCEPT}
        onChange={onFileChange}
      />
      <div
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
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
        ) : error ? (
          <>
            <AlertCircle className="size-5 text-danger" />
            <p className="text-sm text-danger">{error}</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-1"
              onClick={(e) => {
                e.stopPropagation();
                setError(null);
                inputRef.current?.click();
              }}
            >
              Попробовать снова
            </Button>
          </>
        ) : (
          <>
            <ImageIcon className="size-6 text-text-muted" />
            <p className="text-sm text-text-secondary">
              Перетащите изображение или нажмите для загрузки
            </p>
            <p className="text-xs text-text-muted">
              PNG, JPEG, WebP, SVG — до 10 МБ
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setPickerOpen(true);
              }}
            >
              Выбрать из медиатеки
            </Button>
          </>
        )}
      </div>
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        uploadType="image"
        accept={IMAGE_ACCEPT}
        title="Выбрать изображение"
        onSelect={(asset) => onChange(asset.url)}
      />
    </>
  );
}
