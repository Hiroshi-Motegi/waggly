"use client";

import { Loading } from "@/components/loading";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useClub } from "@/hooks/use-clubs";
import type { ClubMemo } from "@/types/database";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function MemoDetailPage({ params }: { params: Promise<{ clubId: string; memoId: string }> }) {
  const { clubId, memoId } = use(params);
  const { club } = useClub(clubId);
  const router = useRouter();
  const [memo, setMemo] = useState<ClubMemo | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    apiFetch(`/api/clubs/${clubId}/memos/${memoId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setMemo)
      .catch(() => setMemo(null))
      .finally(() => setIsFetching(false));
  }, [clubId, memoId]);

  async function handleDelete() {
    if (!confirm("このメモを削除しますか？")) return;
    const res = await apiFetch(`/api/clubs/${clubId}/memos/${memoId}`, { method: "DELETE" });
    if (res.ok) router.push(`/bag/${clubId}/memos`);
  }

  if (isFetching) return <Loading variant="light" />;
  if (!memo) return <p className="p-4 text-center text-muted-foreground">メモが見つかりません</p>;

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1">
          <button onClick={() => router.back()} className="text-white p-1 -ml-1">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <span className="text-xs font-bold text-white">{club?.club_number}</span>
            <h2 className="text-lg font-bold text-white">メモ</h2>
          </div>
        </div>
        <div className="flex gap-1">
          <Link href={`/bag/${clubId}/memos/${memoId}/edit`}>
            <Button size="sm" variant="outline" className="gap-1 border-white text-white bg-transparent">
              <Pencil className="h-4 w-4" />
              編集
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {memo.condition && (
              <img src={`/images/face-${memo.condition === "normal" ? "ok" : memo.condition}.png`} alt="" className="w-6 h-6" />
            )}
            <span className="text-sm text-[#8b8b8b]">
              {formatDate(memo.created_at.split("T")[0])}
            </span>
          </div>
          {memo.distance && (
            <span className="rounded-full bg-[#c7e2ca] px-2 py-0.5 text-xs font-medium text-black">
              {memo.distance} yd
            </span>
          )}
        </div>

        {/* Tags */}
        {[...(memo.symptom_tags ?? []), ...(memo.feeling_tags ?? []), ...(memo.gear_tags ?? [])].length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(memo.symptom_tags ?? []).map((tag) => (
              <span key={tag} className="rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-xs text-[#333]">{tag}</span>
            ))}
            {(memo.feeling_tags ?? []).map((tag) => (
              <span key={tag} className="rounded-full bg-[#fff8e1] px-2.5 py-0.5 text-xs text-[#333]">{tag}</span>
            ))}
            {(memo.gear_tags ?? []).map((tag) => (
              <span key={tag} className="rounded-full bg-[#e8f4fd] px-2.5 py-0.5 text-xs text-[#333]">{tag}</span>
            ))}
          </div>
        )}

        {memo.memo && (
          <div className="border-t border-[#dfdfdf] pt-3">
            <p className="text-sm whitespace-pre-wrap">{memo.memo}</p>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button onClick={handleDelete} className="text-sm font-bold text-red-300">
          このメモを削除
        </button>
      </div>
      </div>
    </div>
  );
}
