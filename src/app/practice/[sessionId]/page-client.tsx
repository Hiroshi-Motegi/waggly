"use client";
import { Loading } from "@/components/loading";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import { deletePracticeSession } from "@/hooks/use-practice";
import { getConditionImage } from "@/components/club/inline-club-memo";
import type { PracticeSessionWithClubs, MemoCondition } from "@/types/database";
import { nativeHref } from "@/lib/native-routes";
import { isNative } from "@/lib/platform";
import { formatDate } from "@/lib/utils";

export default function PracticeDetailPage({ overrideSessionId }: { overrideSessionId?: string } = {}) {
  const routeParams = useParams<{ sessionId: string }>();
  const sessionId = overrideSessionId ?? routeParams.sessionId;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [session, setSession] = useState<PracticeSessionWithClubs | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  async function handleDelete() {
    if (!confirm("この練習記録を削除しますか？")) return;
    try {
      await deletePracticeSession(sessionId);
      router.push("/practice?deleted=1");
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user && !isNative()) return;

    async function fetchSession() {
      setIsFetching(true);
      try {
        const res = await apiFetch(`/api/practice/${sessionId}`);
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

  if (authLoading || isFetching) {
    return <Loading variant="light" />;
  }

  if (!session) {
    return <div className="px-2 pt-16"><div className="rounded-lg bg-white p-6 text-center"><p className="text-base text-[#8b8b8b]">記録が見つかりません</p></div></div>;
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="練習記録" backHref="/practice" variant="dark">
        <Link href={nativeHref(`/practice/${sessionId}/edit`)}>
          <button className="flex items-center gap-1 rounded-full border border-white px-3 h-[40px] text-sm font-bold text-white">
            <Pencil className="h-4 w-4" />
            編集
          </button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium text-[#8b8b8b]">
            {formatDate(session.practiced_at)}
          </span>
          {session.total_balls && (
            <span className="rounded-full border border-[#8b8b8b] px-2.5 py-1 text-xs font-bold text-black">
              {session.total_balls}球
            </span>
          )}
        </div>

        <div>
          <p className="text-base font-bold">{session.location || "場所未入力"}</p>
        </div>

        {session.rating != null && (
          <div className="border-t border-[#dfdfdf] pt-3">
            <p className="text-sm font-medium text-[#8b8b8b] mb-1">評価</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={`text-xl ${star <= session.rating! ? "text-amber-400" : "text-gray-300"}`}>★</span>
              ))}
            </div>
          </div>
        )}

        {session.memo && (
          <div className="border-t border-[#dfdfdf] pt-3">
            <p className="text-sm font-medium text-[#8b8b8b] mb-1">メモ</p>
            <p className="text-base whitespace-pre-wrap">{session.memo}</p>
          </div>
        )}

      </div>

      {session.practice_clubs && session.practice_clubs.length > 0 && (
        <>
          <p className="text-base font-bold text-white px-1 pt-4">クラブ別</p>
          <div className="flex flex-col rounded-lg bg-white p-3">
            {session.practice_clubs.map((pc, i) => (
              <div key={pc.club_id} className={`flex flex-col py-2 ${i < session.practice_clubs.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                {/* Row 1: badge + maker/model */}
                <div className="flex items-center gap-1.5">
                  <span className="bg-[#006728] text-white text-xs font-bold rounded-md px-2 py-0.5 min-w-[32px] text-center">{pc.club?.club_number ?? "?"}</span>
                  {(pc.club?.maker || pc.club?.model) && (
                    <span className="text-sm text-[#8b8b8b] truncate">
                      {[pc.club?.maker, pc.club?.model].filter(Boolean).join(" ")}
                    </span>
                  )}
                </div>
                {/* Row 2: condition + yd/球 badges + tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  {pc.memo?.condition && (
                    <img src={getConditionImage(pc.memo.condition as MemoCondition)} alt="" className="w-5 h-5" />
                  )}
                  {pc.avg_distance != null && (
                    <span className="rounded-full border border-[#8b8b8b] px-2.5 py-1 text-xs font-bold text-black">{pc.avg_distance}yd</span>
                  )}
                  <span className="rounded-full border border-[#8b8b8b] px-2.5 py-1 text-xs font-bold text-black">{pc.balls}球</span>
                  {pc.memo && (
                    <>
                      {pc.memo.symptom_tags.map((tag: string) => (
                        <span key={tag} className="rounded-full bg-[#f0f0f0] p-1.5 text-xs font-medium text-black">{tag}</span>
                      ))}
                      {pc.memo.feeling_tags.map((tag: string) => (
                        <span key={tag} className="rounded-full bg-[#f0f0f0] p-1.5 text-xs font-medium text-black">{tag}</span>
                      ))}
                      {pc.memo.gear_tags.map((tag: string) => (
                        <span key={tag} className="rounded-full bg-[#f0f0f0] p-1.5 text-xs font-medium text-black">{tag}</span>
                      ))}
                    </>
                  )}
                </div>
                {/* Row 3: memo text */}
                {pc.memo?.memo && (
                  <p className="text-sm text-black pt-1.5 line-clamp-2 overflow-hidden">{pc.memo.memo}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex justify-center pt-4 pb-4">
        <button onClick={handleDelete} className="text-base font-bold text-white">
          この記録を削除
        </button>
      </div>
      </div>
    </div>
  );
}
