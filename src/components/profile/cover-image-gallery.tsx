"use client";

import { useState } from "react";
import { Plus, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { ProfileCoverImage } from "@/types/database";
import { ImagePicker } from "@/components/ui/image-picker";

interface CoverImageGalleryProps {
  images: ProfileCoverImage[];
  onUpload: (newImage: ProfileCoverImage) => void;
  onDelete: (imageId: string) => void;
  onReorder: (images: ProfileCoverImage[]) => void;
}

const MAX_IMAGES = 5;

export function CoverImageGallery({ images, onUpload, onDelete, onReorder }: CoverImageGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handlePick(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch("/api/profile/cover-images", {
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
    if (!confirm("このカバー画像を削除しますか？")) return;
    setDeletingId(imageId);
    try {
      const res = await apiFetch(`/api/profile/cover-images/${imageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDelete(imageId);
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

    onReorder(reordered);

    await apiFetch("/api/profile/cover-images/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((img) => img.id) }),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {images.map((img, i) => (
        <div key={img.id} className="flex flex-col gap-1.5">
          <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg bg-[#f0f0f0]">
            <img src={img.image_url} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => handleMove(i, -1)}
                className="p-1 text-[#8b8b8b] disabled:opacity-20"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={i === images.length - 1}
                onClick={() => handleMove(i, 1)}
                className="p-1 text-[#8b8b8b] disabled:opacity-20"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(img.id)}
              disabled={deletingId === img.id}
              className="rounded-full border border-[#c4c4c4] px-3 py-1 text-sm font-bold text-[#8b8b8b]"
            >
              {deletingId === img.id ? "削除中..." : "削除"}
            </button>
          </div>
        </div>
      ))}
      {images.length < MAX_IMAGES && (
        isUploading ? (
          <div className="flex aspect-[2/1] w-full items-center justify-center rounded-lg border-2 border-dashed border-[#006728] text-[#006728]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ImagePicker onPick={handlePick} aspectRatio={2} maxOutputWidth={1600}>
            <button
              type="button"
              className="flex w-full aspect-[2/1] items-center justify-center rounded-lg border-2 border-dashed border-[#c4c4c4] text-[#8b8b8b]"
            >
              <Plus className="h-6 w-6" />
            </button>
          </ImagePicker>
        )
      )}
    </div>
  );
}
