"use client";

import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "./media-picker-dialog";
import type { MediaAsset } from "@/lib/api/types";
import { useState } from "react";

export function MediaUploadButton({
  uploadType,
  accept,
  label = "Загрузить",
  onUploaded,
}: {
  uploadType: "video" | "document";
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
        title={uploadType === "video" ? "Выбрать видео" : "Выбрать документ"}
        onSelect={(asset) => onUploaded(asset.url, asset)}
      />
    </>
  );
}
