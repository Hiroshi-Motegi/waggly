"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ClubForm } from "@/components/club/club-form";
import { ClubImageGallery } from "@/components/club/club-image-gallery";
import { useClub, updateClub } from "@/hooks/use-clubs";
import type { Club } from "@/types/database";

export default function EditClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const { club, isLoading } = useClub(clubId);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: Partial<Club>) {
    setIsSubmitting(true);
    try {
      await updateClub(clubId, data);
      router.push(`/bag/${clubId}`);
    } catch (error) {
      console.error("Failed to update club:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  if (!club) return <p className="p-4 text-center text-muted-foreground">クラブが見つかりません</p>;

  const { club_images, maintenances, id, user_id, created_at, ...editableData } = club as any;

  return (
    <div>
      <h2 className="px-3 pt-4 text-lg font-bold text-[#006728]">クラブを編集</h2>
      <div className="px-3 pt-3">
        <div className="rounded-lg bg-white p-3">
          <span className="text-xs">写真</span>
          <ClubImageGallery
            clubId={clubId}
            images={club.club_images ?? []}
            onUpload={() => window.location.reload()}
          />
        </div>
      </div>
      <ClubForm initialData={editableData} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      <div className="flex justify-center pb-8 -mt-2">
        <button onClick={() => router.back()} className="text-sm font-bold text-[#006728]">
          キャンセル
        </button>
      </div>
    </div>
  );
}
