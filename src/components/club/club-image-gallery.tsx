"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { ClubImage } from "@/types/database";
import { ImagePicker } from "@/components/ui/image-picker";

interface ClubImageGalleryProps {
  clubId: string;
  images: ClubImage[];
  onUpload: (newImage: ClubImage) => void;
}

export function ClubImageGallery({ clubId, images, onUpload }: ClubImageGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);

  async function handlePick(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch(`/api/clubs/${clubId}/images`, {
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

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((img) => (
          <img
            key={img.id}
            src={img.image_url}
            alt="Club"
            className={`h-20 w-20 shrink-0 rounded-lg object-cover ${
              img.is_primary ? "ring-2 ring-[#006728]" : ""
            }`}
          />
        ))}
        {isUploading ? (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[#006728] text-[#006728]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ImagePicker onPick={handlePick}>
            <button
              type="button"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[#c4c4c4] text-[#8b8b8b]"
            >
              <Plus className="h-6 w-6" />
            </button>
          </ImagePicker>
        )}
      </div>
    </div>
  );
}
