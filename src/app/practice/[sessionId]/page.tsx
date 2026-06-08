"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (!session) {
    return <p className="p-4 text-center text-muted-foreground">記録が見つかりません</p>;
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#006728]">練習記録</h2>
        <Link href={`/practice/${sessionId}/edit`}>
          <Button size="sm" variant="outline" className="gap-1 border-[#006728] text-[#006728]">
            <Pencil className="h-4 w-4" />
            編集
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#8b8b8b]">
            {formatDate(session.practiced_at)}
          </span>
          {session.total_balls && (
            <Badge className="bg-[#c7e2ca] text-black hover:bg-[#c7e2ca]">
              {session.total_balls}球
            </Badge>
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

        {session.practice_clubs && session.practice_clubs.length > 0 && (
          <div className="border-t border-[#dfdfdf] pt-3">
            <p className="text-xs font-medium text-[#8b8b8b] mb-2">クラブ別</p>
            <div className="flex flex-col gap-1.5">
              {session.practice_clubs.map((pc) => (
                <div key={pc.club_id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{pc.club?.club_number ?? "?"}</span>
                  <div className="flex items-center gap-2">
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
          </div>
        )}
      </div>
    </div>
  );
}
