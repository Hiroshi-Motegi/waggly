"use client";
import { Loading } from "@/components/loading";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SessionForm } from "@/components/practice/session-form";
import { useClubs } from "@/hooks/use-clubs";
import { updatePracticeSession, deletePracticeSession } from "@/hooks/use-practice";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import type { PracticeSessionWithClubs } from "@/types/database";

export default function EditPracticePage({ overrideSessionId }: { overrideSessionId?: string } = {}) {
  const router = useRouter();
  const routeParams = useParams<{ sessionId: string }>();
  const sessionId = overrideSessionId ?? routeParams.sessionId;
  const { user, isLoading: authLoading } = useAuth();
  const { clubs } = useClubs("bag", 1);
  const { clubs: bag2Clubs } = useClubs("bag", 2);
  const { clubs: reserveClubs } = useClubs("reserve");

  const [pastLocations, setPastLocations] = useState<string[]>([]);
  const [session, setSession] = useState<PracticeSessionWithClubs | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    apiFetch("/api/practice/locations")
      .then((r) => r.ok ? r.json() : [])
      .then(setPastLocations)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchSession() {
      setIsFetching(true);
      try {
        const res = await apiFetch(`/api/practice/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);
          if (data.plan_id) {
            const planRes = await apiFetch(`/api/coach/plans?id=${data.plan_id}`);
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
    return <Loading variant="light" />;
  }

  if (!session) {
    return <p className="p-4 text-center text-sm text-[#8b8b8b]">記録が見つかりません</p>;
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
      memo: pc.memo ? {
        condition: pc.memo.condition!,
        symptom_tags: pc.memo.symptom_tags,
        feeling_tags: pc.memo.feeling_tags,
        gear_tags: pc.memo.gear_tags,
        memo: pc.memo.memo,
      } : null,
    })),
  };

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="練習記録を編集" variant="dark" />

      {/* Plan card */}
      {plan && (
        <div className="mt-2 rounded-lg bg-white p-3">
          <button
            onClick={() => setPlanOpen(!planOpen)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{plan.title}</p>
              <p className="text-xs text-[#8b8b8b]">練習メニュー</p>
            </div>
            {planOpen ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
          </button>
          {planOpen && (
            <div className="mt-2 pt-2 border-t border-[#dfdfdf] flex flex-col gap-2">
              <p className="text-xs text-[#8b8b8b]">{plan.summary}</p>
              {plan.practice_plan_items?.map((item: any, index: number) => (
                <div key={item.id} className={index > 0 ? "border-t border-[#dfdfdf] pt-2" : ""}>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#c7e2ca] px-2 py-0.5 text-[10px] font-medium text-black">
                      {item.club?.club_number ?? "?"}
                    </span>
                    <span className="text-xs text-[#8b8b8b]">{item.balls}球</span>
                  </div>
                  <p className="text-xs font-bold mt-0.5">{item.focus}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <SessionForm
        clubs={clubs}
        bag2Clubs={bag2Clubs}
        reserveClubs={reserveClubs}
        pastLocations={pastLocations}
        initialData={initialData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        showCancel
        onCancel={() => router.back()}
      />
      <div className="flex justify-center py-2">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-sm font-bold text-white disabled:opacity-50"
        >
          {isDeleting ? "削除中..." : "この記録を削除"}
        </button>
      </div>
      </div>
    </div>
  );
}
