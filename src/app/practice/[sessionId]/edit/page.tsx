"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SessionForm } from "@/components/practice/session-form";
import { useClubs } from "@/hooks/use-clubs";
import { updatePracticeSession, deletePracticeSession } from "@/hooks/use-practice";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { PracticeSessionWithClubs } from "@/types/database";

export default function EditPracticePage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { clubs } = useClubs("bag");

  const [session, setSession] = useState<PracticeSessionWithClubs | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [planOpen, setPlanOpen] = useState(false);
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
          const data = await res.json();
          setSession(data);
          // Fetch linked plan if exists
          if (data.plan_id) {
            const planRes = await fetch(`/api/coach/plans?id=${data.plan_id}`);
            if (planRes.ok) {
              const plans = await planRes.json();
              if (Array.isArray(plans)) {
                setPlan(plans.find((p: any) => p.id === data.plan_id) ?? null);
              }
            }
          }
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
      avg_distance: pc.avg_distance,
    })),
  };

  return (
    <div>
      <div className="flex items-center justify-between px-3 pt-4">
        <h2 className="text-lg font-bold text-[#006728]">練習記録を編集</h2>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-sm font-bold text-red-500 disabled:opacity-50"
        >
          {isDeleting ? "削除中..." : "削除"}
        </button>
      </div>
      {plan && (
        <div className="mx-4 mt-3">
          <Card>
            <button
              onClick={() => setPlanOpen(!planOpen)}
              className="w-full flex items-center justify-between p-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{plan.title}</p>
                <p className="text-xs text-muted-foreground">練習メニュー</p>
              </div>
              {planOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {planOpen && (
              <CardContent className="pt-0 space-y-3">
                <Separator />
                <p className="text-xs text-muted-foreground">{plan.summary}</p>
                {plan.practice_plan_items?.map((item: any, index: number) => {
                  const titleMatch = item.focus?.match(/^【(.+?)(?:｜|\\|)(.+?)】\s*([\s\S]*)$/);
                  const title = titleMatch ? titleMatch[1] : null;
                  const subtitle = titleMatch ? titleMatch[2] : null;
                  const body = titleMatch ? titleMatch[3] : item.focus;
                  return (
                    <div key={item.id} className="space-y-1">
                      {index > 0 && <Separator />}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{item.club?.club_number ?? "?"}</Badge>
                        <span className="text-xs font-medium">{item.balls}球</span>
                      </div>
                      {title && (
                        <p className="text-xs font-bold">{title}
                          {subtitle && <span className="text-xs text-muted-foreground font-normal ml-1">{subtitle}</span>}
                        </p>
                      )}
                      {body && <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>}
                    </div>
                  );
                })}
                <Link href={`/coach/plans/${plan.id}`} className="block text-xs text-primary hover:underline text-center pt-1">
                  詳細を見る
                </Link>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      <SessionForm
        clubs={clubs}
        initialData={initialData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        showCancel
        onCancel={() => router.back()}
      />
    </div>
  );
}
