"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SessionForm } from "@/components/practice/session-form";
import { useClubs } from "@/hooks/use-clubs";
import { createPracticeSession } from "@/hooks/use-practice";

export default function NewPracticePage() {
  const router = useRouter();
  const { clubs } = useClubs("active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: any) {
    setIsSubmitting(true);
    try {
      await createPracticeSession(data);
      router.push("/practice");
    } catch (error) {
      console.error("Failed to create practice session:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="px-4 pt-4 text-xl font-bold">練習を記録</h2>
      <SessionForm clubs={clubs} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
