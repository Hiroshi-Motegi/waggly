"use client";
import { Loading } from "@/components/loading";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import type { PracticeSessionWithClubs } from "@/types/database";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function PracticeDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [session, setSession] = useState<PracticeSessionWithClubs | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

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

  if (authLoading || isFetching) {
    return <Loading />;
  }

  if (!session) {
    return <p className="p-4 text-center text-muted-foreground">記録が見つかりません</p>;
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="練習記録" backHref="/practice" variant="dark">
        <Link href={`/practice/${sessionId}/edit`}>
          <button className="flex items-center gap-1 rounded-full border border-white px-3 py-1.5 text-xs font-bold text-white">
            <Pencil className="h-4 w-4" />
            編集
          </button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#8b8b8b]">
            {formatDate(session.practiced_at)}
          </span>
          {session.total_balls && (
            <span className="rounded-full bg-[#c7e2ca] px-2 py-0.5 text-[10px] font-medium text-black">
              {session.total_balls}球
            </span>
          )}
        </div>

        <div>
          <p className="text-base font-bold">{session.location || "場所未入力"}</p>
        </div>

        {session.memo && (
          <div className="border-t border-[#dfdfdf] pt-3">
            <p className="text-xs font-medium text-[#8b8b8b] mb-1">メモ</p>
            <p className="text-sm whitespace-pre-wrap">{session.memo}</p>
          </div>
        )}

      </div>

      {session.practice_clubs && session.practice_clubs.length > 0 && (
        <>
          <p className="text-base font-bold text-white px-1 pt-4">クラブ別</p>
          <div className="flex flex-col rounded-lg bg-white p-3">
            {session.practice_clubs.map((pc, i) => (
              <div key={pc.club_id} className={`flex items-center justify-between py-2 text-sm ${i < session.practice_clubs.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                <div className="min-w-0">
                  <span className="font-bold">{pc.club?.club_number ?? "?"}</span>
                  {(pc.club?.maker || pc.club?.model) && (
                    <span className="ml-1.5 text-xs text-[#8b8b8b]">
                      {[pc.club?.maker, pc.club?.model].filter(Boolean).join(" ")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pc.avg_distance != null && (
                    <span className="text-xs text-[#8b8b8b]">{pc.avg_distance} yd</span>
                  )}
                  <span className="rounded-full bg-[#c7e2ca] px-2 py-0.5 text-xs">
                    {pc.balls}球
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
