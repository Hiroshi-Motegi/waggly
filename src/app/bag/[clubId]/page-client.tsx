"use client";
import { Loading } from "@/components/loading";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Trash2, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { apiFetch } from "@/lib/api-client";
import { ClubUsageSummary } from "@/components/club/club-usage-summary";
import { useAuth } from "@/hooks/use-auth";
import { useClub, deleteClub, updateClub } from "@/hooks/use-clubs";
import { nativeHref } from "@/lib/native-routes";
import { formatDate } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  bag: "マイバッグ",
  reserve: "保管庫",
  sold: "アーカイブ",
};

type SpecItem = { key: string; label: string; suffix?: string };
type SpecSection = { title: string; items: SpecItem[]; titleKey?: string; cols?: number };

function getSpecSections(category: string): SpecSection[] {
  const isPutter = category === "putter";
  const sections: SpecSection[] = [];

  // クラブスペック
  sections.push({
    title: "クラブスペック",
    items: [
      { key: "loft", label: "ロフト角", suffix: "°" },
      { key: "lie", label: "ライ角", suffix: "°" },
      { key: "length", label: "長さ", suffix: "inch" },
      { key: "weight", label: "総重量", suffix: "g" },
      { key: "swing_weight", label: "バランス" },
    ],
  });

  // シャフト（パター非表示）
  if (!isPutter) {
    const shaftItems: SpecItem[] = [
      { key: "shaft_name", label: "シャフト名" },
      { key: "shaft_flex", label: "フレックス" },
      { key: "shaft_weight", label: "シャフト重量", suffix: "g" },
      { key: "frequency", label: "振動数", suffix: "cpm" },
      { key: "kick_point", label: "キックポイント" },
    ];
    sections.push({ title: "シャフト", items: shaftItems, titleKey: "shaft_name", cols: 3 });
  }

  // ヘッドスペック
  const headItems: SpecItem[] = [
    { key: "head_weight", label: "ヘッド重量", suffix: "g" },
  ];
  if (category === "driver" || category === "fairway_wood") {
    headItems.push({ key: "head_volume", label: "ヘッド体積", suffix: "cc" });
  }
  if (category === "driver") {
    headItems.push({ key: "face_angle", label: "フェース角", suffix: "°" });
  }
  if (category === "wedge") {
    headItems.push({ key: "bounce", label: "バウンス角", suffix: "°" });
    headItems.push({ key: "sole_shape", label: "ソール形状" });
  }
  sections.push({ title: "ヘッドスペック", items: headItems, cols: 3 });

  // グリップ
  sections.push({
    title: "グリップ",
    items: [
      { key: "grip_name", label: "グリップ名" },
      { key: "grip_size", label: "太さ" },
    ],
    titleKey: "grip_name",
  });

  return sections;
}

function SpecGrid({ items, club, cols = 2 }: { items: SpecItem[]; club: any; cols?: number }) {
  const filled = items.filter((s) => {
    const v = club[s.key];
    return v != null && v !== "";
  });
  if (filled.length === 0) return null;
  const gridClass = cols === 3 ? "grid grid-cols-3 gap-1.5" : "grid grid-cols-2 gap-1.5";
  return (
    <div className={gridClass}>
      {filled.map((spec) => (
        <div key={spec.key} className="flex flex-col rounded-lg border border-[#ececec] bg-[#fafafa] p-2">
          <span className="text-[10px] text-[#8b8b8b]">{spec.label}</span>
          <span className="text-base font-bold text-black">
            {String(club[spec.key])}{spec.suffix ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

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

const badgeColors: Record<string, string> = {
  memo: "border border-[#006728] text-[#006728] bg-white",
  practice: "border border-[#3573e5] text-[#3573e5] bg-white",
  maintenance: "border border-[#b5850a] text-[#b5850a] bg-white",
};

const badgeLabels: Record<string, string> = {
  memo: "メモ",
  practice: "練習",
  maintenance: "メンテナンス",
};

function ClubImageCarousel({ images, clubNumber }: { images: { id: string; image_url: string }[]; clubNumber: string }) {
  const [index, setIndex] = useState(0);
  return (
    <div>
      <div className="relative mx-auto w-full max-w-[280px] aspect-square overflow-hidden rounded-lg">
        <img
          src={images[index].image_url}
          alt={clubNumber}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex justify-center gap-2 mt-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full transition-colors ${i === index ? "bg-[#006728]" : "bg-[#c5c5c5]"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function ClubDetailPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const { club, isLoading } = useClub(clubId);
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityCount, setActivityCount] = useState(0);
  const [latestDistance, setLatestDistance] = useState<number | null>(null);
  const [hasSummary, setHasSummary] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (!club) return;
    Promise.all([
      apiFetch(`/api/clubs/${clubId}/summary`).then((r) => r.ok ? r.json() : null),
      apiFetch(`/api/clubs/${clubId}/history`).then((r) => r.ok ? r.json() : []),
    ]).then(([summaryData, historyData]) => {
      if (summaryData && (summaryData.totalBalls > 0 || summaryData.memoCount > 0)) {
        setHasSummary(true);
      }
      const data = historyData as ActivityItem[];
      setActivityCount(data.length);
      setActivity(data.slice(0, 3));
      const dist = data.find((d) =>
        (d.type === "memo" && d.distance != null) ||
        (d.type === "practice" && d.avg_distance != null)
      );
      if (dist) {
        setLatestDistance(dist.type === "memo" ? dist.distance! : dist.avg_distance!);
      }
    }).catch(() => {}).finally(() => setActivityLoading(false));
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

  if (isLoading) return <Loading variant="light" />;
  if (!club) return <div className="px-2 pt-16"><div className="rounded-lg bg-white p-6 text-center"><p className="text-base text-[#8b8b8b]">クラブが見つかりません</p></div></div>;

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader
        title={club.model || "—"}
        subtitle={`${club.club_number}${club.maker ? ` / ${club.maker}` : ""}`}
        variant="dark"
      >
        <div className="flex gap-2.5 shrink-0">
          <Link href={nativeHref(`/bag/${clubId}/edit`)}>
            <button className="flex items-center justify-center rounded-full bg-white h-[40px] w-[40px]">
              <Pencil className="h-5 w-5 text-[#006728]" />
            </button>
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center rounded-full bg-white h-[40px] w-[40px]"
          >
            <Trash2 className="h-5 w-5 text-[#006728]" />
          </button>
        </div>
      </PageHeader>

      {/* Specs card */}
      <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
        {(() => {
          const images = club.club_images ?? [];
          const noImage: Record<string, string> = {
            driver: "/no-images/driver.png", fairway_wood: "/no-images/fw.png", utility: "/no-images/ut.png",
            iron: "/no-images/Iron.png", wedge: "/no-images/wedge.png", putter: "/no-images/putter.png",
          };
          if (images.length === 0) {
            return (
              <div className="flex items-center justify-center py-2">
                <img
                  src={noImage[club.category] ?? "/no-images/etc.png"}
                  alt={club.club_number}
                  className="max-h-[229px] rounded object-contain"
                />
              </div>
            );
          }
          if (images.length === 1) {
            return (
              <div className="relative mx-auto w-full max-w-[280px] aspect-square overflow-hidden rounded-lg">
                <img
                  src={images[0].image_url}
                  alt={club.club_number}
                  className="w-full h-full object-cover"
                />
              </div>
            );
          }
          return <ClubImageCarousel images={images} clubNumber={club.club_number} />;
        })()}
        <div className="flex flex-col gap-3">
          {latestDistance != null && (
            <div className="flex flex-col rounded-lg border border-[#ececec] bg-[#fafafa] p-2 mt-4">
              <span className="text-[10px] text-[#8b8b8b]">飛距離</span>
              <span className="text-lg font-bold text-black">{latestDistance} yd</span>
            </div>
          )}

          {/* スペックシート */}
          {getSpecSections(club.category).map((section, i) => {
            const filled = section.items.filter((s) => {
              const v = (club as any)[s.key];
              return v != null && v !== "";
            });
            if (filled.length === 0) return null;
            const titleKey = section.titleKey ? (club as any)[section.titleKey] : null;
            return (
              <div key={section.title} className={i > 0 ? "pt-2" : ""}>
                <div className="flex items-baseline gap-2 mb-1">
                  <p className="text-sm font-bold text-[#333]">{section.title}</p>
                  {titleKey && <span className="text-sm text-[#666]">{titleKey}</span>}
                </div>
                <SpecGrid items={section.items.filter((s) => s.key !== section.titleKey)} club={club} cols={section.cols} />
              </div>
            );
          })}

          {/* 購入情報 */}
          {(club.release_year || club.purchase_date || club.purchase_shop || club.purchase_price != null) && (
            <div className="pt-2">
              <p className="text-sm font-bold text-[#333] mb-1">購入情報</p>
              <div className="flex flex-col">
                {club.release_year && (
                  <div className="flex items-center gap-2.5 border-b border-[#ececec] py-2 text-sm">
                    <span className="shrink-0 text-[#8b8b8b]">発売年</span>
                    <span className="flex-1 text-right">{club.release_year}年</span>
                  </div>
                )}
                {club.purchase_date && (
                  <div className="flex items-center gap-2.5 border-b border-[#ececec] py-2 text-sm">
                    <span className="shrink-0 text-[#8b8b8b]">購入日</span>
                    <span className="flex-1 text-right">{formatDate(club.purchase_date)}</span>
                  </div>
                )}
                {club.purchase_shop && (
                  <div className="flex items-center gap-2.5 border-b border-[#ececec] py-2 text-sm">
                    <span className="shrink-0 text-[#8b8b8b]">購入店</span>
                    <span className="flex-1 text-right">{club.purchase_shop}</span>
                  </div>
                )}
                {club.purchase_price != null && (
                  <div className="flex items-center gap-2.5 py-2 text-sm">
                    <span className="shrink-0 text-[#8b8b8b]">価格</span>
                    <span className="flex-1 text-right font-medium">{club.purchase_price.toLocaleString()}円</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status change buttons inside card */}
        <div className="flex flex-wrap items-center justify-center gap-2 py-5">
          {!(club.status === "bag" && club.bag_number === 1) && (
            <button onClick={() => handleStatusChange("bag", 1)} className="rounded-full border border-[#006728] bg-white px-4 py-1 text-base font-bold text-[#006728]">
              マイバッグへ
            </button>
          )}
          {!(club.status === "bag" && club.bag_number === 2) && (
            <button onClick={() => handleStatusChange("bag", 2)} className="rounded-full border border-[#006728] bg-white px-4 py-1 text-base font-bold text-[#006728]">
              予備バッグへ
            </button>
          )}
          {club.status !== "reserve" && (
            <button onClick={() => handleStatusChange("reserve")} className="rounded-full border border-[#006728] bg-white px-4 py-1 text-base font-bold text-[#006728]">
              保管庫へ
            </button>
          )}
          {club.status !== "sold" && (
            <button onClick={() => handleStatusChange("sold")} className="rounded-full border border-[#006728] bg-white px-4 py-1 text-base font-bold text-[#006728]">
              アーカイブへ
            </button>
          )}
        </div>
      </div>

      {/* 使用感サマリー */}
      {user && hasSummary && (
        <div className="flex flex-col gap-2 pt-4">
          <h3 className="text-lg font-bold text-white px-1">使用感サマリー</h3>
          <ClubUsageSummary clubId={clubId} />
        </div>
      )}

      {/* Activity header */}
      <div className="flex items-center gap-1.5 px-1 pt-4">
        <h3 className="shrink-0 text-lg font-bold text-white">アクティビティ</h3>
        <div className="flex flex-1 justify-end gap-1.5">
          <Link
            href={nativeHref(`/bag/${clubId}/memos?add=1`)}
            className="flex items-center gap-1 rounded-full bg-[#006728] px-4 h-[40px] text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            メモ
          </Link>
          <Link
            href={nativeHref(`/bag/${clubId}/maintenances?add=1`)}
            className="flex items-center gap-1 rounded-full bg-[#006728] px-3.5 h-[40px] text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            メンテナンス
          </Link>
        </div>
      </div>

      {/* Activity card */}
      <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
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
        ) : activity.length > 0 ? (
          <div className="flex flex-col">
            {activity.map((item, i) => (
              <ActivityRow key={`${item.type}-${item.id}`} item={item} clubId={clubId} isLast={i === activity.length - 1} />
            ))}
          </div>
        ) : (
          <p className="py-2 text-base text-[#8b8b8b]">記録なし</p>
        )}

        <div className="flex justify-center pt-1">
          <Link
            href={nativeHref(`/bag/${clubId}/memos`)}
            className="rounded-full border border-[#006728] px-5 py-1 text-base font-bold text-[#006728]"
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

  // Title line (location or maintenance label)
  let title = "";
  if (item.type === "practice" && item.location) title = item.location;
  if (item.type === "maintenance") title = item.maintenance_label ?? "";

  // Memo text
  let memoText = item.memo ?? "";

  const allTags = [...(item.symptom_tags ?? []), ...(item.feeling_tags ?? []), ...(item.gear_tags ?? [])];

  const conditionLabel: Record<string, string> = { good: "Good", normal: "OK", bad: "Bad" };
  const conditionColor: Record<string, string> = { good: "bg-[#ffedce] text-[#e28e08]", normal: "bg-[#d8f6db] text-[#006728]", bad: "bg-[#ffe6e7] text-[#d54848]" };

  return (
    <Link href={href}>
      <div className={`flex items-center gap-2.5 py-3 ${!isLast ? "border-b border-[#dfdfdf]" : ""}`}>
        <div className="flex flex-1 flex-col gap-px min-w-0">
          {/* Row 1: type badge + date + yd/球 badges */}
          <div className="flex items-center gap-1.5">
            <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${badgeColors[item.type]}`}>
              {badgeLabels[item.type]}
            </span>
            <span className="flex-1 text-sm font-medium text-[#8b8b8b]">{dateStr}</span>
            {(item.type === "memo" && item.distance) && (
              <span className="rounded-full border border-[#6b6b6b] px-2.5 py-1 text-xs font-bold text-[#474747]">{item.distance}yd</span>
            )}
            {(item.type === "practice" && item.avg_distance) && (
              <span className="rounded-full border border-[#6b6b6b] px-2.5 py-1 text-xs font-bold text-[#474747]">{item.avg_distance}yd</span>
            )}
            {(item.type === "practice" && item.balls) && (
              <span className="rounded-full border border-[#6b6b6b] px-2.5 py-1 text-xs font-bold text-[#474747]">{item.balls}球</span>
            )}
          </div>
          {/* Row 2: title (bold, green) */}
          {title && (
            <p className="text-sm font-bold text-[#006728] pt-1 pb-0.5 pl-1.5">{title}</p>
          )}
          {/* Row 3: condition badge + tags in light border box */}
          {(item.condition || allTags.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 py-1.5 mt-1">
              {item.condition && (
                <span className="flex items-center h-7 rounded-full">
                  <img src={`/images/face-${item.condition === "normal" ? "ok" : item.condition}.png`} alt="" className="w-7 h-7 shrink-0 relative z-10" />
                  <span className={`h-7 flex items-center rounded-r-full -ml-3 pl-4 pr-2.5 text-xs font-bold ${conditionColor[item.condition] ?? conditionColor.normal}`}>
                    {conditionLabel[item.condition] ?? "OK"}
                  </span>
                </span>
              )}
              {allTags.map((tag) => (
                <span key={tag} className="h-7 flex items-center rounded-full bg-[#eee] px-2.5 text-xs font-medium text-black">{tag}</span>
              ))}
            </div>
          )}
          {/* Row 4: memo text */}
          {memoText && (
            <p className="text-sm text-black pt-1.5 pl-1.5 line-clamp-2 overflow-hidden">{memoText}</p>
          )}
        </div>
        <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="shrink-0 opacity-60" style={{ width: "auto", height: "auto" }} />
      </div>
    </Link>
  );
}
