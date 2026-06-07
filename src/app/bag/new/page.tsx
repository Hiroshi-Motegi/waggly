"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClubForm } from "@/components/club/club-form";
import { createClub } from "@/hooks/use-clubs";
import type { Club } from "@/types/database";

export default function NewClubPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: Partial<Club>) {
    setIsSubmitting(true);
    try {
      await createClub({ status: "bag", ...data });
      router.push("/bag");
    } catch (error) {
      console.error("Failed to create club:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="px-4 pt-4 text-xl font-bold">クラブを追加</h2>
      <ClubForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
