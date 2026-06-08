"use client";
import { Loading } from "@/components/loading";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useClub } from "@/hooks/use-clubs";

interface ActivityItem {
  type: "memo" | "practice" | "maintenance";
  id: string;
  date: string;
  distance?: number | null;
  memo?: string | null;
  session_id?: string;
  practiced_at?: string;
  location?: string | null;
  balls?: number;
  avg_distance?: number | null;
  done_at?: string;
  maintenance_type?: string;
  maintenance_label?: string;
  description?: string | null;
}

const badgeColors: Record<string, string> = {
  memo: "bg-[#c7e2ca]",
  practice: "bg-[#c7e2e2]",
  maintenance: "bg-[#c7e2e2]",
};

const badgeLabels: Record<string, string> = {
  memo: "メモ",
  practice: "練習",
  maintenance: "メンテナンス",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function ActivityListPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddMode = searchParams.get("add") === "1";
  const { club, isLoading } = useClub(clubId);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [showMemoForm, setShowMemoForm] = useState(isAddMode);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ distance: "", memo: "" });

  function fetchHistory() {
    fetch(`/api/clubs/${clubId}/history`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setActivity)
      .catch(() => setActivity([]));
  }

  useEffect(() => {
    if (!club || isAddMode) return;
    fetchHistory();
  }, [clubId, club, isAddMode]);

  async function handleMemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/memos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distance: form.distance ? Number(form.distance) : null,
          memo: form.memo || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      if (isAddMode) {
        router.push(`/bag/${clubId}`);
        return;
      }
      fetchHistory();
      setShowMemoForm(false);
      setForm({ distance: "", memo: "" });
    } catch (error) {
      console.error("Failed to create memo:", error);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <Loading />;
  if (!club) return <p className="p-4 text-center text-muted-foreground">クラブが見つかりません</p>;

  // Add mode: dedicated form page
  if (isAddMode) {
    return (
      <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
        <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
        <div className="relative z-10 flex flex-col space-y-2">
          <form onSubmit={handleMemoSubmit} className="flex flex-col" style={{ minHeight: "calc(100dvh - var(--bottom-nav-height))" }}>
            <div className="px-1 pb-2">
              <span className="text-xs font-bold text-white">
                {club.club_number}{club.maker ? ` / ${club.maker}` : ""}{club.model ? ` ${club.model}` : ""}
              </span>
              <h2 className="text-lg font-bold text-white">メモの追加</h2>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
              <div className="flex flex-col gap-0.5 py-1">
                <span className="text-xs">飛距離</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={form.distance}
                    onChange={(e) => setForm({ ...form, distance: e.target.value })}
                    className="w-[100px] rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
                  />
                  <span className="text-xs">yd</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 py-1">
                <span className="text-xs">所感・メモ</span>
                <textarea
                  value={form.memo}
                  onChange={(e) => setForm({ ...form, memo: e.target.value })}
                  rows={10}
                  className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
                />
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex flex-col items-center gap-2 px-6 pt-4 pb-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-white border border-white py-2 text-sm font-bold text-[#006728] disabled:opacity-50"
              >
                {submitting ? "保存中..." : "保存する"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-1 text-sm font-bold text-white"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // List mode: activity timeline
  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-xs font-bold text-white">{club.club_number}</span>
          <h2 className="text-lg font-bold text-white">アクティビティ</h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowMemoForm(!showMemoForm)}
            className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#006728]"
          >
            <Plus className="h-3 w-3" />
            メモ
          </button>
          <Link
            href={`/bag/${clubId}/maintenances?add=1`}
            className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#006728]"
          >
            <Plus className="h-3 w-3" />
            メンテナンス
          </Link>
        </div>
      </div>

      {showMemoForm && (
        <form onSubmit={handleMemoSubmit} className="flex flex-col gap-3 rounded-lg bg-white p-3">
          <div className="space-y-1">
            <label className="text-xs">飛距離</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={form.distance}
                onChange={(e) => setForm({ ...form, distance: e.target.value })}
                className="w-[100px] rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
              />
              <span className="text-xs">yd</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs">所感・メモ</label>
            <textarea
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowMemoForm(false)} className="flex-1 rounded-full border border-[#006728] py-2 text-sm font-bold text-[#006728]">
              キャンセル
            </button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-full bg-[#006728] py-2 text-sm font-bold text-white disabled:opacity-50">
              {submitting ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col rounded-lg bg-white p-3">
        {activity.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#8b8b8b]">記録なし</p>
        ) : (
          <div className="flex flex-col">
            {activity.map((item, i) => {
              const href = item.type === "memo"
                ? `/bag/${clubId}/memos/${item.id}`
                : item.type === "practice"
                  ? `/practice/${item.session_id}`
                  : `/bag/${clubId}/maintenances/${item.id}`;

              const dateStr = item.type === "practice" && item.practiced_at
                ? formatDate(item.practiced_at)
                : item.type === "maintenance" && item.done_at
                  ? formatDate(item.done_at)
                  : formatDate(item.date.split("T")[0]);

              let summary = "";
              if (item.type === "memo" && item.distance) summary = `${item.distance} yd`;
              if (item.type === "practice") {
                const parts: string[] = [];
                if (item.avg_distance) parts.push(`${item.avg_distance}yd`);
                if (item.balls) parts.push(`${item.balls}球`);
                summary = parts.join(" ");
              }

              let detail = "";
              if (item.type === "memo" && item.memo) detail = item.memo;
              if (item.type === "practice" && item.location) detail = item.location;
              if (item.type === "maintenance") detail = item.maintenance_label ?? "";

              return (
                <Link key={`${item.type}-${item.id}`} href={href}>
                  <div className={`flex items-center gap-2.5 py-2 ${i < activity.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                    <div className="flex flex-1 flex-col gap-px min-w-0">
                      <div className="flex items-center gap-[5px]">
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium text-black ${badgeColors[item.type]}`}>
                          {badgeLabels[item.type]}
                        </span>
                        {summary && (
                          <span className="text-[10px] font-medium text-[#8b8b8b]">{summary}</span>
                        )}
                        <span className="text-[10px] font-medium text-[#8b8b8b] ml-auto shrink-0">{dateStr}</span>
                      </div>
                      {detail && (
                        <p className="text-sm font-bold text-black truncate">{detail}</p>
                      )}
                    </div>
                    <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="shrink-0 opacity-60" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
