"use client";

import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "./media-picker-dialog";
import type { MediaAsset, MediaUploadKind } from "@/lib/api/types";
import { useState } from "react";

const PICKER_TITLE: Record<MediaUploadKind, string> = {
  video: "Выбрать видео",
  document: "Выбрать документ",
  audio: "Выбрать аудио",
  image: "Выбрать изображение",
};

export function MediaUploadButton({
  uploadType,
  accept,
  label = "Загрузить",
  onUploaded,
}: {
  uploadType: MediaUploadKind;
  accept: string;
  label?: string;
  onUploaded: (url: string, asset?: MediaAsset) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        uploadType={uploadType}
        accept={accept}
        title={PICKER_TITLE[uploadType]}
        onSelect={(asset) => onUploaded(asset.url, asset)}
      />
    </>
  );
}
