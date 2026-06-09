"use client";
import { Loading } from "@/components/loading";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { nativeHref } from "@/lib/native-routes";
import { Plus, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { useClubs, updateClub } from "@/hooks/use-clubs";
import type { ClubStatus, ClubWithImages } from "@/types/database";
import { ShareWitbButton } from "@/components/bag/share-witb-button";
import { getDistanceStaircaseData, getWeightFlowData, getDistanceInsights, getWeightInsights } from "@/lib/gap-analysis";
import { DistanceStaircase } from "@/components/charts/distance-staircase";
import { WeightFlow } from "@/components/charts/weight-flow";
import { ChartInsights } from "@/components/charts/chart-insights";

const MAX_BAG_CLUBS = 14;

const categoryOrder: Record<string, number> = {
  driver: 100, fairway_wood: 200, utility: 300, iron: 400, wedge: 500, putter: 600,
};
const wedgeOrder: Record<string, number> = { PW: 1, AW: 2, SW: 3, LW: 4 };

function clubSortKey(club: ClubWithImages): number {
  // If sort_order was explicitly set by user reordering, use it
  // Otherwise compute from category + club_number
  const base = categoryOrder[club.category] ?? 900;
  if (club.category === "driver" || club.category === "putter") return base;
  if (club.category === "wedge" && wedgeOrder[club.club_number]) return base + wedgeOrder[club.club_number];
  const num = parseInt(club.club_number, 10);
  return base + (isNaN(num) ? 50 : num);
}

const statusLabels: Record<string, string> = {
  bag: "マイバッグ",
  reserve: "予備",
  sold: "アーカイブ",
};

type FilterTab = "all" | "bag1" | "bag2" | "reserve" | "sold";

const filterTabs: { value: FilterTab; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "bag1", label: "マイバッグ" },
  { value: "bag2", label: "予備バッグ" },
  { value: "reserve", label: "予備" },
  { value: "sold", label: "アーカイブ" },
];

function getFilterParams(tab: FilterTab): { status?: ClubStatus; bagNumber?: number } {
  if (tab === "all") return {};
  if (tab === "bag1") return { status: "bag", bagNumber: 1 };
  if (tab === "bag2") return { status: "bag", bagNumber: 2 };
  return { status: tab as ClubStatus };
}

function ClubRow({
  club,
  showStatus,
  bagLabel,
  isReordering,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  club: ClubWithImages;
  showStatus?: boolean;
  bagLabel?: string;
  isReordering?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const primaryImage = club.club_images?.find((img) => img.is_primary) ?? club.club_images?.[0];

  const content = (
    <div className="flex items-center gap-2.5 py-2">
      {isReordering && (
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveUp?.(); }}
            disabled={isFirst}
            className="p-0.5 text-[#8b8b8b] hover:text-black disabled:opacity-20"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveDown?.(); }}
            disabled={isLast}
            className="p-0.5 text-[#8b8b8b] hover:text-black disabled:opacity-20"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="size-[50px] shrink-0 overflow-hidden rounded bg-[#f0f0f0] flex items-center justify-center">
        {primaryImage ? (
          <img
            src={primaryImage.image_url}
            alt={club.club_number}
            className="size-full object-cover"
          />
        ) : (
          <Image src="/icons/cat-club.svg" alt="" width={30} height={30} className="opacity-50" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-px min-w-0">
        <span className="text-xs font-medium text-[#8b8b8b]">
          {club.club_number}
        </span>
        <span className="text-sm font-bold text-black truncate">
          {club.model ?? "—"}
        </span>
        <span className="text-xs text-[#8b8b8b] truncate">
          {club.maker ?? "—"}
          {(club.latest_avg_distance ?? club.distance) != null && ` · ${club.latest_avg_distance ?? club.distance} yd`}
        </span>
      </div>
      {showStatus && bagLabel && (
        <span className="shrink-0 rounded-full bg-[#c7e2ca] px-1.5 py-0.5 text-[10px] font-medium text-black">
          {bagLabel}
        </span>
      )}
      {!isReordering && (
        <Image
          src="/icons/chevron-right.svg"
          alt=""
          width={6}
          height={10}
          className="shrink-0 opacity-60"
        />
      )}
    </div>
  );

  if (isReordering) return content;
  return <Link href={nativeHref(`/bag/${club.id}`)}>{content}</Link>;
}

const validTabs: FilterTab[] = ["all", "bag1", "bag2", "reserve", "sold"];

export default function BagPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as FilterTab | null;
  const statusFilter: FilterTab = tabParam && validTabs.includes(tabParam) ? tabParam : "bag1";

  function setStatusFilter(tab: FilterTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "bag1") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(`/bag${qs ? `?${qs}` : ""}`, { scroll: false });
  }
  const filterParams = getFilterParams(statusFilter);
  const { clubs, isLoading, refetch } = useClubs(filterParams.status, filterParams.bagNumber);
  const [isReordering, setIsReordering] = useState(false);
  const [localClubs, setLocalClubs] = useState<ClubWithImages[]>([]);
  const [chartTab, setChartTab] = useState<"distance" | "weight">("distance");

  const isBagView = statusFilter === "bag1" || statusFilter === "bag2";

  const bagClubs = clubs.filter((c) => c.status === "bag" && c.bag_number === (statusFilter === "bag2" ? 2 : 1));
  const distanceData = getDistanceStaircaseData(bagClubs);
  const weightData = getWeightFlowData(bagClubs);
  const distanceInsights = getDistanceInsights(distanceData);
  const weightInsights = getWeightInsights(weightData);
  const showCharts = statusFilter === "bag1" || statusFilter === "bag2";

  const displayClubs = isReordering
    ? localClubs
    : isBagView
      ? [...clubs].sort((a, b) => clubSortKey(a) - clubSortKey(b))
      : clubs;

  const bagCount = isBagView ? clubs.length : null;
  const bagLabel = statusFilter === "bag1" ? "マイバッグ" : statusFilter === "bag2" ? "予備バッグ" : "マイバッグ";

  function startReorder() {
    setLocalClubs([...clubs].sort((a, b) => a.sort_order - b.sort_order));
    setIsReordering(true);
  }

  async function saveOrder() {
    await Promise.all(
      localClubs.map((club, index) =>
        updateClub(club.id, { sort_order: index } as any)
      )
    );
    setIsReordering(false);
    refetch();
  }

  function cancelReorder() {
    setIsReordering(false);
    setLocalClubs([]);
  }

  function moveClub(index: number, direction: "up" | "down") {
    const newClubs = [...localClubs];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newClubs.length) return;
    [newClubs[index], newClubs[targetIndex]] = [newClubs[targetIndex], newClubs[index]];
    setLocalClubs(newClubs);
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader
        title={isBagView && bagCount !== null ? `${bagLabel} (${bagCount}/${MAX_BAG_CLUBS})` : "マイバッグ"}
        showBack={false}
        variant="dark"
      >
        <div className="flex gap-2">
          {isBagView && !isReordering && clubs.length > 1 && (
            <button
              onClick={startReorder}
              className="flex items-center gap-1 rounded-full border border-white px-3 py-1.5 text-xs font-bold text-white"
            >
              <GripVertical className="h-4 w-4" />
              並替
            </button>
          )}
          {!isReordering && (
            <Link href="/bag/new">
              <button
                className="flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#006728] disabled:opacity-50"
                disabled={isBagView && (bagCount ?? 0) >= MAX_BAG_CLUBS}
              >
                <Plus className="h-4 w-4" />
                追加
              </button>
            </Link>
          )}
        </div>
      </PageHeader>

      <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
        {/* Tabs */}
        {!isReordering && (
          <div className="relative">
            <div className="flex items-end gap-0.5 overflow-x-auto scrollbar-hide">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className="flex shrink-0 flex-col items-center gap-0.5 pt-1"
                >
                  <span className="px-3 py-0.5 text-sm font-bold text-[#006728] whitespace-nowrap">
                    {tab.label}
                  </span>
                  <div
                    className={`h-0.5 w-full ${
                      statusFilter === tab.value ? "bg-[#006728]" : "bg-[#a5cbb4]"
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ececec] -z-[1]" />
          </div>
        )}

        {/* Charts */}
        {showCharts && !isReordering && (
          <div className="rounded-lg bg-white p-3">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setChartTab("distance")}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  chartTab === "distance"
                    ? "bg-[#006728] text-white"
                    : "bg-[#f0f0f0] text-[#666]"
                }`}
              >
                飛距離階段
              </button>
              <button
                onClick={() => setChartTab("weight")}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  chartTab === "weight"
                    ? "bg-[#006728] text-white"
                    : "bg-[#f0f0f0] text-[#666]"
                }`}
              >
                重量フロー
              </button>
            </div>
            {chartTab === "distance" ? (
              <>
                <DistanceStaircase data={distanceData} />
                <ChartInsights insights={distanceInsights} />
              </>
            ) : (
              <>
                <WeightFlow data={weightData} />
                <ChartInsights insights={weightInsights} />
              </>
            )}
          </div>
        )}
        {showCharts && !isReordering && (
          <div className="flex justify-end">
            <ShareWitbButton bagNumber={statusFilter === "bag2" ? 2 : 1} />
          </div>
        )}

        {/* List */}
        {isReordering ? (
          <>
            <div className="flex flex-col">
              {displayClubs.map((club, index) => (
                <div
                  key={club.id}
                  className={index < displayClubs.length - 1 ? "border-b border-[#dfdfdf]" : ""}
                >
                  <ClubRow
                    club={club}
                    isReordering
                    isFirst={index === 0}
                    isLast={index === displayClubs.length - 1}
                    onMoveUp={() => moveClub(index, "up")}
                    onMoveDown={() => moveClub(index, "down")}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={cancelReorder}
                className="flex-1 rounded-full border border-white py-2 text-sm font-bold text-white"
              >
                キャンセル
              </button>
              <button
                onClick={saveOrder}
                className="flex-1 rounded-full bg-[#006728] py-2 text-sm font-bold text-white"
              >
                保存
              </button>
            </div>
          </>
        ) : isLoading ? (
          <Loading />
        ) : clubs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            クラブが登録されていません
          </p>
        ) : (
          <div className="flex flex-col">
            {displayClubs.map((club, index) => (
              <div
                key={club.id}
                className={index < displayClubs.length - 1 ? "border-b border-[#dfdfdf]" : ""}
              >
                <ClubRow club={club} showStatus={statusFilter === "all"} bagLabel={statusFilter === "all" ? (club.status === "bag" ? (club.bag_number === 2 ? "予備バッグ" : "マイバッグ") : statusLabels[club.status]) : undefined} />
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
