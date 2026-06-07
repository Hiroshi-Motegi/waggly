"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { SessionForm } from "@/components/practice/session-form";
import { useClubs } from "@/hooks/use-clubs";
import { updatePracticeSession, deletePracticeSession } from "@/hooks/use-practice";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import type { PracticeSessionWithClubs } from "@/types/database";

export default function EditPracticePage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { clubs } = useClubs("bag");

  const [session, setSession] = useState<PracticeSessionWithClubs | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    async function fetchSession() {
      setIsFetching(true);
      try {
        const res = await fetch(`/api/practice/${sessionId}`);
        if (res.ok) {
          setSession(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch session:", error);
      } finally {
        setIsFetching(false);
      }
    }

    fetchSession();
  }, [sessionId, user, authLoading]);

  async function handleSubmit(data: any) {
    setIsSubmitting(true);
    try {
      await updatePracticeSession(sessionId, data);
      router.push("/practice");
    } catch (error) {
      console.error("Failed to update practice session:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("この練習記録を削除しますか？")) return;
    setIsDeleting(true);
    try {
      await deletePracticeSession(sessionId);
      router.push("/practice");
    } catch (error) {
      console.error("Failed to delete practice session:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  if (authLoading || isFetching) {
    return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (!session) {
    return <p className="p-4 text-center text-muted-foreground">記録が見つかりません</p>;
  }

  const initialData = {
    practiced_at: session.practiced_at,
    location: session.location,
    total_balls: session.total_balls,
    memo: session.memo,
    practice_clubs: session.practice_clubs?.map((pc) => ({
      club_id: pc.club_id,
      balls: pc.balls,
    })),
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-xl font-bold">練習記録を編集</h2>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "削除中..." : "削除"}
        </Button>
      </div>
      <SessionForm
        clubs={clubs}
        initialData={initialData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
