"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { Club } from "@/types/database";
import { InlineClubMemo, type InlineClubMemoValue, getConditionImage, getConditionLabel } from "@/components/club/inline-club-memo";

export interface ClubBallsValue {
  club_id: string;
  balls: number;
  avg_distance?: number | null;
  memo?: InlineClubMemoValue | null;
}

interface ClubBallsInputProps {
  clubs: Club[];
  bag2Clubs?: Club[];
  reserveClubs?: Club[];
  value: ClubBallsValue[];
  onChange: (value: ClubBallsValue[]) => void;
}

type ClubTab = "bag" | "bag2" | "reserve";

const categoryLabels: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

const categoryOrder = ["driver", "fairway_wood", "utility", "iron", "wedge", "putter"];

function groupByCategory(clubs: Club[]): { label: string; clubs: Club[] }[] {
  const groups: Record<string, Club[]> = {};
  for (const club of clubs) {
    const cat = club.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(club);
  }
  return categoryOrder
    .filter((cat) => groups[cat]?.length)
    .map((cat) => ({ label: categoryLabels[cat] ?? cat, clubs: groups[cat] }));
}

function MemoToggle({ hasMemo, memoValue, onMemoChange }: {
  hasMemo: boolean;
  memoValue: InlineClubMemoValue | null;
  onMemoChange: (value: InlineClubMemoValue | null) => void;
}) {
  const [open, setOpen] = useState(hasMemo);

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-[7px] text-sm font-bold"
      >
        <ChevronDown className={`h-3 w-3 text-[#8b8b8b] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        {hasMemo && memoValue?.condition ? (
          <>
            <img src={getConditionImage(memoValue.condition)} alt="" className="w-[22px] h-[22px]" />
            <span>{getConditionLabel(memoValue.condition)}</span>
          </>
        ) : (
          <>
            <img src="/images/face-none.png" alt="" className="w-[22px] h-[22px]" />
            <span>調子を入力</span>
          </>
        )}
      </button>
      {open && (
        <InlineClubMemo value={memoValue} onChange={onMemoChange} />
      )}
    </div>
  );
}

function ClubAccordion({ club, entry, onUpdate, isLast, open, onToggle }: {
  club: Club;
  entry: ClubBallsValue | undefined;
  onUpdate: (clubId: string, patch: Partial<ClubBallsValue>) => void;
  isLast: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const currentBalls = entry?.balls ?? 0;
  const currentDistance = entry?.avg_distance ?? club.distance ?? 0;
  const subLabel = [club.maker, club.model].filter(Boolean).join(" ");
  const hasData = currentBalls > 0 || entry?.memo != null;
  const headerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && headerRef.current) {
      setTimeout(() => {
        headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [open]);

  return (
    <div className={`flex flex-col ${!isLast ? "border-b border-[#e8e8e8]" : ""}`}>
      {/* Collapsed header */}
      <button
        ref={headerRef}
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 py-3 w-full text-left scroll-mt-[80px]"
      >
        <span className="bg-[#006728] text-white text-sm rounded-full px-2.5 shrink-0">{club.club_number}</span>
        <span className="flex-1 text-sm text-[#6c6c6c] truncate">{subLabel || "—"}</span>
        {!open && hasData && <span className="w-2 h-2 rounded-full bg-[#006728] shrink-0" />}
        <ChevronDown className={`h-4 w-4 text-[#8b8b8b] shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded content */}
      {open && (
        <div className="flex flex-col gap-1 pb-3">
          {/* Distance slider */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={300}
                step={5}
                value={currentDistance}
                onChange={(e) => onUpdate(club.id, { avg_distance: Number(e.target.value) || null })}
                className="club-balls-slider w-full"
              />
            </div>
            <div className="flex items-center gap-1 w-[72px] shrink-0">
              <input
                type="number"
                inputMode="decimal"
                value={entry?.avg_distance ?? ""}
                onChange={(e) => onUpdate(club.id, { avg_distance: e.target.value ? Number(e.target.value) : null })}
                placeholder="—"
                className="w-[52px] rounded-md border border-[#c4c4c4] bg-white px-1 py-1.5 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
              />
              <span className="text-xs">yd</span>
            </div>
          </div>

          {/* Balls slider */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={currentBalls}
                onChange={(e) => onUpdate(club.id, { balls: Number(e.target.value) })}
                className="club-balls-slider w-full"
              />
            </div>
            <div className="flex items-center gap-1 w-[72px] shrink-0">
              <input
                type="number"
                inputMode="numeric"
                value={currentBalls || ""}
                onChange={(e) => onUpdate(club.id, { balls: e.target.value ? Number(e.target.value) : 0 })}
                placeholder="—"
                className="w-[52px] rounded-md border border-[#c4c4c4] bg-white px-1 py-1.5 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
              />
              <span className="text-xs">球</span>
            </div>
          </div>

          {/* Memo toggle */}
          <MemoToggle
            hasMemo={entry?.memo != null}
            memoValue={entry?.memo ?? null}
            onMemoChange={(memo) => onUpdate(club.id, { memo })}
          />
        </div>
      )}
    </div>
  );
}

export function ClubBallsInput({ clubs, bag2Clubs, reserveClubs, value, onChange }: ClubBallsInputProps) {
  const [activeTab, setActiveTab] = useState<ClubTab>("bag");
  const [openClubId, setOpenClubId] = useState<string | null>(null);
  const displayClubs = activeTab === "bag2" ? (bag2Clubs ?? []) : activeTab === "reserve" ? (reserveClubs ?? []) : clubs;
  const hasTabs = (bag2Clubs && bag2Clubs.length > 0) || (reserveClubs && reserveClubs.length > 0);

  function getEntry(clubId: string): ClubBallsValue | undefined {
    return value.find((v) => v.club_id === clubId);
  }

  function update(clubId: string, patch: Partial<ClubBallsValue>) {
    const existing = value.filter((v) => v.club_id !== clubId);
    const current = getEntry(clubId) ?? { club_id: clubId, balls: 0, avg_distance: null, memo: null };
    const updated = { ...current, ...patch };
    if (updated.balls > 0 || (updated.avg_distance != null && updated.avg_distance > 0) || updated.memo != null) {
      onChange([...existing, updated]);
    } else {
      onChange(existing);
    }
  }

  const tabItems: { value: ClubTab; label: string; show: boolean }[] = [
    { value: "bag", label: "マイバッグ", show: true },
    { value: "bag2", label: "予備バッグ", show: (bag2Clubs ?? []).length > 0 },
    { value: "reserve", label: "予備", show: (reserveClubs ?? []).length > 0 },
  ];

  return (
    <div className="flex flex-col gap-3">
      {hasTabs && (
        <div className="flex gap-1">
          {tabItems.filter((t) => t.show).map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setActiveTab(t.value)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                activeTab === t.value ? "bg-[#006728] text-white" : "border border-[#c4c4c4] text-[#8b8b8b]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {displayClubs.length === 0 && (
        <p className="text-xs text-[#8b8b8b] py-2">
          {activeTab === "bag" ? "マイバッグにクラブが登録されていません" : activeTab === "bag2" ? "予備バッグにクラブが登録されていません" : "予備クラブが登録されていません"}
        </p>
      )}

      {groupByCategory(displayClubs).map((group) => (
        <div key={group.label}>
          <p className="text-xs font-bold text-[#006728] pb-1.5 pt-1">{group.label}</p>
          <div className="flex flex-col rounded-lg bg-[#f8faf8] px-3">
            {group.clubs.map((club, i) => (
              <ClubAccordion
                key={club.id}
                club={club}
                entry={getEntry(club.id)}
                onUpdate={update}
                isLast={i === group.clubs.length - 1}
                open={openClubId === club.id}
                onToggle={() => setOpenClubId(openClubId === club.id ? null : club.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
