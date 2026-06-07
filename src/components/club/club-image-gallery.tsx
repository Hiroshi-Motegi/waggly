"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import type { ClubImage } from "@/types/database";

interface ClubImageGalleryProps {
  clubId: string;
  images: ClubImage[];
  onUpload: () => void;
}

export function ClubImageGallery({ clubId, images, onUpload }: ClubImageGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/clubs/${clubId}/images`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      onUpload();
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((img) => (
          <img
            key={img.id}
            src={img.image_url}
            alt="Club"
            className={`h-20 w-20 shrink-0 rounded-md object-cover ${
              img.is_primary ? "ring-2 ring-primary" : ""
            }`}
          />
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
