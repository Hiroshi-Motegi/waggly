"use client";

import { Loading } from "@/components/loading";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { apiFetch } from "@/lib/api-client";
import { useClub } from "@/hooks/use-clubs";
import type { ClubMemo } from "@/types/database";
import { nativeHref } from "@/lib/native-routes";

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
    if (res.ok) router.push(nativeHref(`/bag/${clubId}/memos`));
  }

  if (isFetching) return <Loading variant="light" />;
  if (!memo) return <div className="px-2 pt-16"><div className="rounded-lg bg-white p-6 text-center"><p className="text-base text-[#8b8b8b]">メモが見つかりません</p></div></div>;

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="メモ" subtitle={club?.club_number} variant="dark">
        <Link href={nativeHref(`/bag/${clubId}/memos/${memoId}/edit`)}>
          <Button size="sm" variant="outline" className="gap-1 border-white text-white bg-transparent">
            <Pencil className="h-4 w-4" />
            編集
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {memo.condition && (
              <img src={`/images/face-${memo.condition === "normal" ? "ok" : memo.condition}.png`} alt="" className="w-6 h-6" />
            )}
            <span className="text-base text-[#8b8b8b]">
              {formatDate(memo.created_at.split("T")[0])}
            </span>
          </div>
          {memo.distance && (
            <span className="rounded-full border border-[#8b8b8b] px-2.5 py-1 text-xs font-bold text-black">
              {memo.distance} yd
            </span>
          )}
        </div>

        {/* Tags */}
        {[...(memo.symptom_tags ?? []), ...(memo.feeling_tags ?? []), ...(memo.gear_tags ?? [])].length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(memo.symptom_tags ?? []).map((tag) => (
              <span key={tag} className="rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-sm text-[#333]">{tag}</span>
            ))}
            {(memo.feeling_tags ?? []).map((tag) => (
              <span key={tag} className="rounded-full bg-[#fff8e1] px-2.5 py-0.5 text-sm text-[#333]">{tag}</span>
            ))}
            {(memo.gear_tags ?? []).map((tag) => (
              <span key={tag} className="rounded-full bg-[#e8f4fd] px-2.5 py-0.5 text-sm text-[#333]">{tag}</span>
            ))}
          </div>
        )}

        {memo.memo && (
          <div className="border-t border-[#dfdfdf] pt-3">
            <p className="text-base whitespace-pre-wrap">{memo.memo}</p>
          </div>
        )}
      </div>

      <div className="flex justify-center pb-4">
        <button onClick={handleDelete} className="text-base font-bold text-white">
          このメモを削除
        </button>
      </div>
      </div>
    </div>
  );
}
