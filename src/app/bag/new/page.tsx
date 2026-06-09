"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nativeHref } from "@/lib/native-routes";
import { PageHeader } from "@/components/layout/page-header";
import { ClubForm } from "@/components/club/club-form";
import { createClub } from "@/hooks/use-clubs";
import { apiFetch } from "@/lib/api-client";
import type { Club } from "@/types/database";

export default function NewClubPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: Partial<Club>, pendingImage?: File) {
    setIsSubmitting(true);
    try {
      const club = await createClub({ status: "bag", ...data });
      if (pendingImage) {
        const formData = new FormData();
        formData.append("file", pendingImage);
        await apiFetch(`/api/clubs/${club.id}/images`, {
          method: "POST",
          body: formData,
        });
      }
      router.push(nativeHref(`/bag/${club.id}`));
    } catch (error) {
      console.error("Failed to create club:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="クラブを追加" variant="dark" />
        <ClubForm onSubmit={handleSubmit} isSubmitting={isSubmitting} showImagePicker />
      </div>
    </div>
  );
}
