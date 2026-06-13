"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { nativeHref } from "@/lib/native-routes";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";
import { PageHeader } from "@/components/layout/page-header";
import { ClubForm } from "@/components/club/club-form";
import { createClub } from "@/hooks/use-clubs";
import { apiFetch } from "@/lib/api-client";
import type { Club } from "@/types/database";

export default function NewClubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaults: Partial<Club> = tab === "bag2"
    ? { status: "bag", bag_number: 2 }
    : tab === "reserve"
      ? { status: "reserve" }
      : tab === "sold"
        ? { status: "sold" }
        : { status: "bag", bag_number: 1 };

  async function handleSubmit(data: Partial<Club>, pendingImage?: File) {
    setIsSubmitting(true);
    try {
      const club = await createClub({ ...defaults, ...data });
      if (pendingImage) {
        const formData = new FormData();
        formData.append("file", pendingImage);
        await apiFetch(`/api/clubs/${club.id}/images`, {
          method: "POST",
          body: formData,
        });
      }
      router.replace(nativeHref(`/bag/${club.id}`));
    } catch (error) {
      console.error("Failed to create club:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      {isSubmitting && <ProcessingOverlay />}
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="クラブを追加" variant="dark" />
        <ClubForm onSubmit={handleSubmit} isSubmitting={isSubmitting} showImagePicker />
      </div>
    </div>
  );
}
