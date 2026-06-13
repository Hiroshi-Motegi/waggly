"use client";
import { Loading } from "@/components/loading";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClubForm } from "@/components/club/club-form";
import { PageHeader } from "@/components/layout/page-header";
import { ClubImageGallery } from "@/components/club/club-image-gallery";
import { useClub, updateClub } from "@/hooks/use-clubs";
import type { Club, ClubImage } from "@/types/database";
import { nativeHref } from "@/lib/native-routes";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";

export default function EditClubPageClient({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const { club, isLoading } = useClub(clubId);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: Partial<Club>) {
    setIsSubmitting(true);
    try {
      await updateClub(clubId, data);
      router.replace(nativeHref(`/bag/${clubId}`));
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

  if (isLoading) return <Loading variant="light" />;
  if (!club) return <div className="px-2 pt-16"><div className="rounded-lg bg-white p-6 text-center"><p className="text-base text-[#8b8b8b]">クラブが見つかりません</p></div></div>;

  const { club_images, maintenances, id, user_id, created_at, ...editableData } = club as any;

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      {isSubmitting && <ProcessingOverlay />}
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="クラブを編集" variant="dark" />
        <h3 className="px-1 pt-2 text-lg font-bold text-white">写真</h3>
        <div>
          <div className="rounded-lg bg-white p-3">
            <ClubImageGallery
              clubId={clubId}
              images={clubImages}
              onUpload={handleImageUpload}
              onDelete={(imageId) => setClubImages((prev) => prev.filter((img) => img.id !== imageId))}
            />
          </div>
        </div>
        <ClubForm initialData={editableData} onSubmit={handleSubmit} isSubmitting={isSubmitting} onCancel={() => router.back()} />
      </div>
    </div>
  );
}
