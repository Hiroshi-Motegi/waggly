"use client";

import { useState } from "react";
import { Plus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState(0);
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
        setActiveTab(images.length);
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
        if (activeTab >= images.length - 1) setActiveTab(Math.max(0, images.length - 2));
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMove(direction: -1 | 1) {
    const newIndex = activeTab + direction;
    if (newIndex < 0 || newIndex >= images.length) return;
    const reordered = [...images];
    [reordered[activeTab], reordered[newIndex]] = [reordered[newIndex], reordered[activeTab]];

    onReorder(reordered);
    setActiveTab(newIndex);

    await apiFetch("/api/profile/cover-images/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((img) => img.id) }),
    });
  }

  const current = images[activeTab];

  return (
    <div className="flex flex-col gap-2">
      {/* Tabs */}
      <div className="flex gap-1">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveTab(i)}
            className={`min-w-[32px] rounded-md px-2.5 py-1 text-sm font-bold transition-colors ${
              i === activeTab
                ? "bg-[#006728] text-white"
                : "bg-[#f0f0f0] text-[#8b8b8b]"
            }`}
          >
            {i + 1}
          </button>
        ))}
        {images.length < MAX_IMAGES && (
          <ImagePicker onPick={handlePick} aspectRatio={2} maxOutputWidth={1600}>
            <button
              type="button"
              className="min-w-[32px] rounded-md bg-[#f0f0f0] px-2.5 py-1 text-sm font-bold text-[#8b8b8b]"
            >
              +
            </button>
          </ImagePicker>
        )}
      </div>

      {/* Active image */}
      {isUploading ? (
        <div className="flex aspect-[2/1] w-full items-center justify-center rounded-lg border-2 border-dashed border-[#006728] text-[#006728]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : current ? (
        <div className="flex flex-col gap-1.5">
          <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg bg-[#f0f0f0]">
            <img src={current.image_url} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button
                type="button"
                disabled={activeTab === 0}
                onClick={() => handleMove(-1)}
                className="p-1.5 text-[#8b8b8b] disabled:opacity-20"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={activeTab === images.length - 1}
                onClick={() => handleMove(1)}
                className="p-1.5 text-[#8b8b8b] disabled:opacity-20"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(current.id)}
              disabled={deletingId === current.id}
              className="rounded-full border border-[#c4c4c4] px-3 py-1 text-sm font-bold text-[#8b8b8b]"
            >
              {deletingId === current.id ? "削除中..." : "削除"}
            </button>
          </div>
        </div>
      ) : images.length === 0 ? (
        <ImagePicker onPick={handlePick} aspectRatio={2} maxOutputWidth={1600}>
          <button
            type="button"
            className="flex w-full aspect-[2/1] items-center justify-center rounded-lg border-2 border-dashed border-[#c4c4c4] text-[#8b8b8b]"
          >
            <Plus className="h-6 w-6" />
          </button>
        </ImagePicker>
      ) : null}
    </div>
  );
}
