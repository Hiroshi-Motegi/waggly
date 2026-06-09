"use client";
import { Loading } from "@/components/loading";
import { StructuredMemoForm } from "@/components/club/structured-memo-form";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { apiFetch } from "@/lib/api-client";
import { useClub } from "@/hooks/use-clubs";
import type { MemoCondition } from "@/types/database";
import { nativeHref } from "@/lib/native-routes";

interface ActivityItem {
  type: "memo" | "practice" | "maintenance";
  id: string;
  date: string;
  distance?: number | null;
  memo?: string | null;
  condition?: MemoCondition | null;
  symptom_tags?: string[];
  feeling_tags?: string[];
  gear_tags?: string[];
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
  practice: "bg-[#c7d2e2]",
  maintenance: "bg-[#e2dac7]",
};

const badgeLabels: Record<string, string> = {
  memo: "メモ",
  practice: "練習",
  maintenance: "メンテナンス",
};

const conditionImage: Record<string, string> = {
  bad: "/images/face-bad.png",
  normal: "/images/face-ok.png",
  good: "/images/face-good.png",
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
  const [activityLoading, setActivityLoading] = useState(true);
  const [showMemoForm, setShowMemoForm] = useState(isAddMode);

  function fetchHistory() {
    setActivityLoading(true);
    apiFetch(`/api/clubs/${clubId}/history`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setActivity)
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }

  useEffect(() => {
    if (!club || isAddMode) return;
    fetchHistory();
  }, [clubId, club, isAddMode]);

  if (isLoading) return <Loading variant="light" />;
  if (!club) return <p className="p-4 text-center text-muted-foreground">クラブが見つかりません</p>;

  // Add mode: dedicated form page
  if (isAddMode) {
    return (
      <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
        <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
        <div className="relative z-10 flex flex-col space-y-2">
          <PageHeader
            title="メモの追加"
            subtitle={`${club.club_number}${club.maker ? ` / ${club.maker}` : ""}${club.model ? ` ${club.model}` : ""}`}
            backHref={nativeHref(`/bag/${clubId}`)}
            variant="dark"
          />
          <div className="rounded-lg bg-white p-3">
            <StructuredMemoForm
              clubId={clubId}
              clubNumber={club.club_number}
              clubModel={club.model}
              defaultDistance={club.distance}
              onSaved={() => router.push(nativeHref(`/bag/${clubId}`))}
              onCancel={() => router.back()}
            />
          </div>
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
          <span className="text-sm font-bold text-white">{club.club_number}</span>
          <h2 className="text-lg font-bold text-white">アクティビティ</h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowMemoForm(!showMemoForm)}
            className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[#006728]"
          >
            <Plus className="h-3 w-3" />
            メモ
          </button>
          <Link
            href={nativeHref(`/bag/${clubId}/maintenances?add=1`)}
            className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[#006728]"
          >
            <Plus className="h-3 w-3" />
            メンテナンス
          </Link>
        </div>
      </div>

      {showMemoForm && (
        <div className="rounded-lg bg-white p-3">
          <StructuredMemoForm
            clubId={clubId}
            clubNumber={club.club_number}
            clubModel={club.model}
            defaultDistance={club.distance}
            onSaved={() => {
              fetchHistory();
              setShowMemoForm(false);
            }}
            onCancel={() => setShowMemoForm(false)}
          />
        </div>
      )}

      <div className="flex flex-col rounded-lg bg-white p-3">
        {activityLoading ? (
          <div className="flex flex-col gap-3 py-2 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <div className="h-4 w-10 rounded-full bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                </div>
                <div className="h-4 w-3/4 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <p className="py-4 text-center text-base text-[#8b8b8b]">記録なし</p>
        ) : (
          <div className="flex flex-col">
            {activity.map((item, i) => {
              const href = nativeHref(item.type === "memo"
                ? `/bag/${clubId}/memos/${item.id}`
                : item.type === "practice"
                  ? `/practice/${item.session_id}`
                  : `/bag/${clubId}/maintenances/${item.id}`);

              const dateStr = item.type === "practice" && item.practiced_at
                ? formatDate(item.practiced_at)
                : item.type === "maintenance" && item.done_at
                  ? formatDate(item.done_at)
                  : formatDate(item.date.split("T")[0]);

              // Title line
              let title = "";
              if (item.type === "practice" && item.location) title = item.location;
              if (item.type === "maintenance") title = item.maintenance_label ?? "";

              const memoText = item.memo ?? "";

              const allTags = [
                ...(item.symptom_tags ?? []),
                ...(item.feeling_tags ?? []),
                ...(item.gear_tags ?? []),
              ];

              return (
                <Link key={`${item.type}-${item.id}`} href={href}>
                  <div className={`flex items-center gap-2.5 py-2 ${i < activity.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                    <div className="flex flex-1 flex-col gap-px min-w-0">
                      {/* Row 1: badge + date */}
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold text-black ${badgeColors[item.type]}`}>
                          {badgeLabels[item.type]}
                        </span>
                        <span className="text-sm font-medium text-[#8b8b8b]">{dateStr}</span>
                      </div>
                      {/* Row 2: title (bold) */}
                      {title && (
                        <p className="text-sm font-bold text-black pt-1 pb-0.5">{title}</p>
                      )}
                      {/* Row 3: condition + yd/球 badges + tags */}
                      {(item.condition || item.distance || item.avg_distance || item.balls || allTags.length > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                          {item.condition && (
                            <img src={conditionImage[item.condition]} alt="" className="w-5 h-5" />
                          )}
                          {(item.type === "memo" && item.distance) && (
                            <span className="rounded-full border border-[#8b8b8b] px-2.5 py-1 text-xs font-bold text-black">{item.distance}yd</span>
                          )}
                          {(item.type === "practice" && item.avg_distance) && (
                            <span className="rounded-full border border-[#8b8b8b] px-2.5 py-1 text-xs font-bold text-black">{item.avg_distance}yd</span>
                          )}
                          {(item.type === "practice" && item.balls) && (
                            <span className="rounded-full border border-[#8b8b8b] px-2.5 py-1 text-xs font-bold text-black">{item.balls}球</span>
                          )}
                          {allTags.map((tag) => (
                            <span key={tag} className="rounded-full bg-[#f0f0f0] p-1.5 text-xs font-medium text-black">{tag}</span>
                          ))}
                        </div>
                      )}
                      {/* Row 4: memo text */}
                      {memoText && (
                        <p className="text-sm text-black pt-1.5 line-clamp-2 overflow-hidden">{memoText}</p>
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
