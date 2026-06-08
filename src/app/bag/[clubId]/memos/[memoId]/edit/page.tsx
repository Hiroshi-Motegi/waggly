"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClub } from "@/hooks/use-clubs";
import type { ClubMemo } from "@/types/database";

export default function MemoEditPage({ params }: { params: Promise<{ clubId: string; memoId: string }> }) {
  const { clubId, memoId } = use(params);
  const { club } = useClub(clubId);
  const router = useRouter();
  const [form, setForm] = useState({ distance: "", memo: "" });
  const [isFetching, setIsFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/clubs/${clubId}/memos/${memoId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ClubMemo | null) => {
        if (data) {
          setForm({
            distance: data.distance?.toString() ?? "",
            memo: data.memo ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, [clubId, memoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/memos/${memoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distance: form.distance ? Number(form.distance) : null,
          memo: form.memo || null,
        }),
      });
      if (res.ok) router.push(`/bag/${clubId}/memos/${memoId}`);
    } catch (error) {
      console.error("Failed to update memo:", error);
    } finally {
      setSubmitting(false);
    }
  }

  if (isFetching) return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;

  return (
    <div className="flex flex-col gap-4 px-2 py-4">
      <div className="px-1">
        <span className="text-xs font-bold text-[#1e944c]">{club?.club_number}</span>
        <h2 className="text-lg font-bold text-[#006728]">メモを編集</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg bg-white p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium">飛距離</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={form.distance}
              onChange={(e) => setForm({ ...form, distance: e.target.value })}
              className="w-[100px] rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
            />
            <span className="text-xs">yard</span>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">所感・メモ</label>
          <textarea
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            rows={5}
            className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-full border border-[#006728] py-2 text-sm font-bold text-[#006728]"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-full bg-[#006728] py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
