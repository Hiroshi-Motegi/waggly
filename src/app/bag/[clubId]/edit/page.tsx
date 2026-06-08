"use client";
import { Loading } from "@/components/loading";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClubForm } from "@/components/club/club-form";
import { PageHeader } from "@/components/layout/page-header";
import { ClubImageGallery } from "@/components/club/club-image-gallery";
import { useClub, updateClub } from "@/hooks/use-clubs";
import type { Club, ClubImage } from "@/types/database";

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

  const [clubImages, setClubImages] = useState<ClubImage[]>([]);
  const [imagesInitialized, setImagesInitialized] = useState(false);

  // Sync images from club data on first load
  if (club && !imagesInitialized) {
    setClubImages(club.club_images ?? []);
    setImagesInitialized(true);
  }

  const handleImageUpload = useCallback((newImage: ClubImage) => {
    setClubImages((prev) => [...prev, newImage]);
  }, []);

  if (isLoading) return <Loading />;
  if (!club) return <p className="p-4 text-center text-muted-foreground">クラブが見つかりません</p>;

  const { club_images, maintenances, id, user_id, created_at, ...editableData } = club as any;

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="クラブを編集" variant="dark" />
        <div className="px-3 pt-3">
          <div className="rounded-lg bg-white p-3">
            <span className="text-xs">写真</span>
            <ClubImageGallery
              clubId={clubId}
              images={clubImages}
              onUpload={handleImageUpload}
            />
          </div>
        </div>
        <ClubForm initialData={editableData} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        <div className="flex justify-center pb-8 -mt-2">
          <button onClick={() => router.back()} className="text-sm font-bold text-white">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
