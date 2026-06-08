"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    fetch(`/api/clubs/${clubId}/memos/${memoId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setMemo)
      .catch(() => setMemo(null))
      .finally(() => setIsFetching(false));
  }, [clubId, memoId]);

  async function handleDelete() {
    if (!confirm("このメモを削除しますか？")) return;
    const res = await fetch(`/api/clubs/${clubId}/memos/${memoId}`, { method: "DELETE" });
    if (res.ok) router.push(`/bag/${clubId}/memos`);
  }

  if (isFetching) return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  if (!memo) return <p className="p-4 text-center text-muted-foreground">メモが見つかりません</p>;

  return (
    <div className="flex flex-col px-2 py-2 space-y-2">
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-xs font-bold text-[#1e944c]">{club?.club_number}</span>
          <h2 className="text-lg font-bold text-[#006728]">メモ</h2>
        </div>
        <div className="flex gap-1">
          <Link href={`/bag/${clubId}/memos/${memoId}/edit`}>
            <Button size="sm" variant="outline" className="gap-1 border-[#006728] text-[#006728]">
              <Pencil className="h-4 w-4" />
              編集
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#8b8b8b]">
            {formatDate(memo.created_at.split("T")[0])}
          </span>
          {memo.distance && (
            <span className="rounded-full bg-[#c7e2ca] px-2 py-0.5 text-xs font-medium text-black">
              {memo.distance} yd
            </span>
          )}
        </div>

        {memo.memo && (
          <div className="border-t border-[#dfdfdf] pt-3">
            <p className="text-sm whitespace-pre-wrap">{memo.memo}</p>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button onClick={handleDelete} className="text-sm font-bold text-red-500">
          このメモを削除
        </button>
      </div>
    </div>
  );
}
