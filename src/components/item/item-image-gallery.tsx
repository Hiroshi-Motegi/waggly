"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { AccessoryImage } from "@/types/database";
import { ImagePicker } from "@/components/ui/image-picker";

interface ItemImageGalleryProps {
  itemId: string;
  images: AccessoryImage[];
  onUpload: (newImage: AccessoryImage) => void;
  onDelete?: (imageId: string) => void;
}

export function ItemImageGallery({ itemId, images, onUpload, onDelete }: ItemImageGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handlePick(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch(`/api/accessories/${itemId}/images`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newImage = await res.json();
        onUpload(newImage);
      }
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(imageId: string) {
    if (!confirm("この写真を削除しますか？")) return;
    setDeletingId(imageId);
    try {
      const res = await apiFetch(`/api/accessories/${itemId}/images/${imageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDelete?.(imageId);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <div key={img.id} className="flex flex-col items-center gap-2">
            <img
              src={img.image_url}
              alt="Item"
              className="w-full aspect-square rounded-lg object-cover"
            />
            {onDelete && (
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                disabled={deletingId === img.id}
                className="rounded-full border border-[#c4c4c4] px-3 py-1 text-sm font-bold text-[#8b8b8b]"
              >
                {deletingId === img.id ? "削除中..." : "削除"}
              </button>
            )}
          </div>
        ))}
        {isUploading ? (
          <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-[#006728] text-[#006728]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ImagePicker onPick={handlePick}>
            <button
              type="button"
              className="flex w-full aspect-square items-center justify-center rounded-lg border-2 border-dashed border-[#c4c4c4] text-[#8b8b8b]"
            >
              <Plus className="h-6 w-6" />
            </button>
          </ImagePicker>
        )}
      </div>
    </div>
  );
}
