"use client";
import { Loading } from "@/components/loading";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Trash2, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ClubUsageSummary } from "@/components/club/club-usage-summary";
import { useClub, deleteClub, updateClub } from "@/hooks/use-clubs";

const statusLabels: Record<string, string> = {
  bag: "マイバッグ",
  reserve: "予備",
  sold: "アーカイブ",
};

const specs: { key: string; label: string; suffix?: string }[] = [
  { key: "shaft_name", label: "シャフト" },
  { key: "shaft_flex", label: "フレックス" },
  { key: "loft", label: "ロフト角", suffix: "°" },
  { key: "lie", label: "ライ角", suffix: "°" },
  { key: "length", label: "長さ", suffix: "inch" },
];

interface ActivityItem {
  type: "memo" | "practice" | "maintenance";
  id: string;
  date: string;
  // memo
  distance?: number | null;
  memo?: string | null;
  condition?: string | null;
  symptom_tags?: string[];
  feeling_tags?: string[];
  gear_tags?: string[];
  // practice
  session_id?: string;
  practiced_at?: string;
  location?: string | null;
  balls?: number;
  avg_distance?: number | null;
  // maintenance
  done_at?: string;
  maintenance_type?: string;
  maintenance_label?: string;
  description?: string | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
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

export default function ClubDetailPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const { club, isLoading } = useClub(clubId);
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityCount, setActivityCount] = useState(0);
  const [latestDistance, setLatestDistance] = useState<number | null>(null);

  useEffect(() => {
    if (!club) return;
    fetch(`/api/clubs/${clubId}/history`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ActivityItem[]) => {
        setActivityCount(data.length);
        setActivity(data.slice(0, 4));
        // Find latest distance from memo or practice
        const dist = data.find((d) =>
          (d.type === "memo" && d.distance != null) ||
          (d.type === "practice" && d.avg_distance != null)
        );
        if (dist) {
          setLatestDistance(dist.type === "memo" ? dist.distance! : dist.avg_distance!);
        }
      })
      .catch(() => {});
  }, [clubId, club]);

  async function handleStatusChange(newStatus: string, bagNumber?: number) {
    const update: any = { status: newStatus };
    if (bagNumber != null) update.bag_number = bagNumber;
    await updateClub(clubId, update);
    router.push("/bag");
  }

  async function handleDelete() {
    if (!confirm("このクラブを削除しますか？")) return;
    await deleteClub(clubId);
    router.push("/bag");
  }

  if (isLoading) return <Loading />;
  if (!club) return <p className="p-4 text-center text-muted-foreground">クラブが見つかりません</p>;

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader
        title={club.model || "—"}
        subtitle={`${club.club_number}${club.maker ? ` / ${club.maker}` : ""}`}
        backHref="/bag"
        variant="dark"
      >
        <div className="flex gap-1 shrink-0">
          <Link href={`/bag/${clubId}/edit`}>
            <button className="flex items-center justify-center rounded-full bg-white p-2">
              <Pencil className="h-4 w-4 text-[#006728]" />
            </button>
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center rounded-full bg-white p-2"
          >
            <Trash2 className="h-4 w-4 text-[#006728]" />
          </button>
        </div>
      </PageHeader>

      {/* Specs card */}
      <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
        {(() => {
          const primaryImage = club.club_images?.find((img: any) => img.is_primary) ?? club.club_images?.[0];
          return (
            <div className="flex items-center justify-center py-2">
              {primaryImage ? (
                <img src={primaryImage.image_url} alt={club.club_number} className="max-h-[229px] rounded object-contain" />
              ) : (
                <img src="/icons/cat-club.svg" alt="" className="h-[100px] opacity-40" />
              )}
            </div>
          );
        })()}
        <div className="flex flex-col">
          {latestDistance != null && (
            <div className="flex items-center gap-2.5 border-b border-[#dfdfdf] py-3 text-base">
              <span className="shrink-0 font-bold">飛距離</span>
              <span className="flex-1 text-right font-bold text-lg">{latestDistance} yd</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 border-b border-[#dfdfdf] py-2 text-sm">
            <span className="shrink-0">ステータス</span>
            <span className="flex-1 text-right">{statusLabels[club.status]}</span>
          </div>
          {specs.map((spec) => {
            const value = (club as any)[spec.key];
            if (value == null || value === "") return null;
            return (
              <div key={spec.key} className="flex items-center gap-2.5 border-b border-[#dfdfdf] py-2 text-sm">
                <span className="shrink-0">{spec.label}</span>
                <span className="flex-1 text-right">
                  {String(value)}{spec.suffix ? ` ${spec.suffix}` : ""}
                </span>
              </div>
            );
          })}
          {club.purchase_date && (
            <div className="flex items-center gap-2.5 border-b border-[#dfdfdf] py-2 text-sm">
              <span className="shrink-0">購入日</span>
              <span className="flex-1 text-right">{formatDate(club.purchase_date)}</span>
            </div>
          )}
          {club.purchase_shop && (
            <div className="flex items-center gap-2.5 border-b border-[#dfdfdf] py-2 text-sm">
              <span className="shrink-0">購入店</span>
              <span className="flex-1 text-right">{club.purchase_shop}</span>
            </div>
          )}
          {club.purchase_price != null && (
            <div className="flex items-center gap-2.5 py-2 text-sm">
              <span className="shrink-0">価格</span>
              <span className="flex-1 text-right font-medium">{club.purchase_price.toLocaleString()}円</span>
            </div>
          )}

          {/* 詳細スペック（入力済みの場合のみ表示） */}
          {(club.weight != null || club.swing_weight || club.frequency != null || club.kick_point || club.head_volume != null || club.head_weight != null) && (
            <div className="border-t border-[#e8e8e8] pt-3 mt-3">
              <p className="text-xs text-[#8b8b8b] mb-2">詳細スペック</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {club.weight != null && (
                  <div>
                    <span className="text-xs text-[#8b8b8b]">重量</span>
                    <p className="font-medium">{club.weight}g</p>
                  </div>
                )}
                {club.swing_weight && (
                  <div>
                    <span className="text-xs text-[#8b8b8b]">バランス</span>
                    <p className="font-medium">{club.swing_weight}</p>
                  </div>
                )}
                {club.frequency != null && (
                  <div>
                    <span className="text-xs text-[#8b8b8b]">振動数</span>
                    <p className="font-medium">{club.frequency}cpm</p>
                  </div>
                )}
                {club.kick_point && (
                  <div>
                    <span className="text-xs text-[#8b8b8b]">キックポイント</span>
                    <p className="font-medium">{club.kick_point}</p>
                  </div>
                )}
                {club.head_volume != null && (
                  <div>
                    <span className="text-xs text-[#8b8b8b]">ヘッド体積</span>
                    <p className="font-medium">{club.head_volume}cc</p>
                  </div>
                )}
                {club.head_weight != null && (
                  <div>
                    <span className="text-xs text-[#8b8b8b]">ヘッド重量</span>
                    <p className="font-medium">{club.head_weight}g</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status change buttons inside card */}
        <div className="flex flex-wrap items-center justify-center gap-2 py-5">
          {!(club.status === "bag" && club.bag_number === 1) && (
            <button onClick={() => handleStatusChange("bag", 1)} className="rounded-full border border-[#006728] bg-white px-4 py-1 text-sm font-bold text-[#006728]">
              マイバッグに入れる
            </button>
          )}
          {!(club.status === "bag" && club.bag_number === 2) && (
            <button onClick={() => handleStatusChange("bag", 2)} className="rounded-full border border-[#006728] bg-white px-4 py-1 text-sm font-bold text-[#006728]">
              予備バッグに入れる
            </button>
          )}
          {club.status !== "reserve" && (
            <button onClick={() => handleStatusChange("reserve")} className="rounded-full border border-[#006728] bg-white px-4 py-1 text-sm font-bold text-[#006728]">
              予備にする
            </button>
          )}
          {club.status !== "sold" && (
            <button onClick={() => handleStatusChange("sold")} className="rounded-full border border-[#006728] bg-white px-4 py-1 text-sm font-bold text-[#006728]">
              アーカイブする
            </button>
          )}
        </div>
      </div>

      {/* 使用サマリー */}
      <div className="rounded-lg bg-white p-3">
        <h3 className="text-sm font-bold mb-2">使用サマリー（3ヶ月）</h3>
        <ClubUsageSummary clubId={clubId} />
      </div>

      {/* Activity header */}
      <div className="flex items-center gap-2 px-1 pt-4">
        <h3 className="flex-1 text-base font-bold text-white">アクティビティ</h3>
        <Link
          href={`/bag/${clubId}/memos?add=1`}
          className="flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#006728]"
        >
          <Plus className="h-3 w-3" />
          メモ
        </Link>
        <Link
          href={`/bag/${clubId}/maintenances?add=1`}
          className="flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#006728]"
        >
          <Plus className="h-3 w-3" />
          メンテナンス記録
        </Link>
      </div>

      {/* Activity card */}
      <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
        {activity.length > 0 ? (
          <div className="flex flex-col">
            {activity.map((item, i) => (
              <ActivityRow key={`${item.type}-${item.id}`} item={item} clubId={clubId} isLast={i === activity.length - 1} />
            ))}
          </div>
        ) : (
          <p className="py-2 text-sm text-[#8b8b8b]">記録なし</p>
        )}

        <div className="flex justify-center pt-1">
          <Link
            href={`/bag/${clubId}/memos`}
            className="rounded-full border border-[#006728] px-5 py-1 text-sm font-bold text-[#006728]"
          >
            すべて見る
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}

function ActivityRow({ item, clubId, isLast }: { item: ActivityItem; clubId: string; isLast: boolean }) {
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

  // Summary text for the badge row
  let summary = "";
  if (item.type === "memo" && item.distance) summary = `${item.distance} yd`;
  if (item.type === "practice") {
    const parts: string[] = [];
    if (item.avg_distance) parts.push(`${item.avg_distance}yd`);
    if (item.balls) parts.push(`${item.balls}球`);
    summary = parts.join(" ");
  }

  // Second line
  let detail = "";
  if (item.type === "memo" && item.memo) detail = item.memo;
  if (item.type === "practice" && item.location) detail = item.location;
  if (item.type === "maintenance") detail = item.maintenance_label ?? "";

  return (
    <Link href={href}>
      <div className={`flex items-center gap-2.5 py-2 ${!isLast ? "border-b border-[#dfdfdf]" : ""}`}>
        <div className="flex flex-1 flex-col gap-px min-w-0">
          <div className="flex items-center gap-[5px]">
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium text-black ${badgeColors[item.type]}`}>
              {badgeLabels[item.type]}
            </span>
            {item.condition && (
              <span className="text-sm">{item.condition === "good" ? "😊" : item.condition === "bad" ? "😣" : "😐"}</span>
            )}
            {summary && (
              <span className="text-[10px] font-medium text-[#8b8b8b]">{summary}</span>
            )}
            <span className="text-[10px] font-medium text-[#8b8b8b] ml-auto shrink-0">{dateStr}</span>
          </div>
          {[...(item.symptom_tags ?? []), ...(item.feeling_tags ?? []), ...(item.gear_tags ?? [])].length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {[...(item.symptom_tags ?? []), ...(item.feeling_tags ?? []), ...(item.gear_tags ?? [])].map((tag) => (
                <span key={tag} className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] text-[#333]">{tag}</span>
              ))}
            </div>
          )}
          {detail && (
            <p className="text-sm font-bold text-black truncate line-clamp-2">{detail}</p>
          )}
        </div>
        <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="shrink-0 opacity-60" />
      </div>
    </Link>
  );
}
