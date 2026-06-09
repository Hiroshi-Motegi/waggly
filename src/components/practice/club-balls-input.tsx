"use client";

import { useState } from "react";
import { MessageSquarePlus, ChevronUp } from "lucide-react";
import type { Club } from "@/types/database";
import { InlineClubMemo, type InlineClubMemoValue } from "@/components/club/inline-club-memo";

export interface ClubBallsValue {
  club_id: string;
  balls: number;
  avg_distance?: number | null;
  memo?: InlineClubMemoValue | null;
}

interface ClubBallsInputProps {
  clubs: Club[];
  reserveClubs?: Club[];
  value: ClubBallsValue[];
  onChange: (value: ClubBallsValue[]) => void;
}

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
        className="flex items-center gap-1 text-xs text-[#006728] font-bold"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}
        {hasMemo ? (memoValue?.condition === "good" ? "😊" : memoValue?.condition === "bad" ? "😣" : "😐") : "調子を記録する"}
      </button>
      {open && (
        <InlineClubMemo value={memoValue} onChange={onMemoChange} />
      )}
    </div>
  );
}

export function ClubBallsInput({ clubs, reserveClubs, value, onChange }: ClubBallsInputProps) {
  const [showReserve, setShowReserve] = useState(false);
  const displayClubs = showReserve ? (reserveClubs ?? []) : clubs;
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

  return (
    <div className="flex flex-col gap-3">
      {/* バッグ / 予備 切り替え */}
      {reserveClubs && reserveClubs.length > 0 && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setShowReserve(false)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              !showReserve ? "bg-[#006728] text-white" : "border border-[#c4c4c4] text-[#8b8b8b]"
            }`}
          >
            バッグ
          </button>
          <button
            type="button"
            onClick={() => setShowReserve(true)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              showReserve ? "bg-[#006728] text-white" : "border border-[#c4c4c4] text-[#8b8b8b]"
            }`}
          >
            予備
          </button>
        </div>
      )}

      {displayClubs.length === 0 && (
        <p className="text-xs text-[#8b8b8b] py-2">
          {showReserve ? "予備クラブが登録されていません" : "バッグにクラブが登録されていません"}
        </p>
      )}

      {groupByCategory(displayClubs).map((group) => (
        <div key={group.label}>
          <p className="text-xs font-bold text-[#006728] pb-1.5 pt-1">{group.label}</p>
          <div className="flex flex-col rounded-lg bg-[#f8faf8] px-3">
            {group.clubs.map((club, i) => {
              const entry = getEntry(club.id);
              const currentBalls = entry?.balls ?? 0;
              const subLabel = [club.maker, club.model].filter(Boolean).join(" ");

              return (
                <div key={club.id} className={`flex flex-col gap-1 py-3 ${i < group.clubs.length - 1 ? "border-b border-[#e8e8e8]" : ""}`}>
                  {/* Row 1: club name + yd input */}
                  <div className="flex items-center">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold">{club.club_number}</span>
                      {subLabel && <span className="ml-1.5 text-xs text-[#8b8b8b] truncate">{subLabel}</span>}
                    </div>
                    <div className="flex items-center gap-1 w-[72px] shrink-0">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={entry?.avg_distance ?? ""}
                        onChange={(e) =>
                          update(club.id, {
                            avg_distance: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="—"
                        className="w-[52px] rounded-md border border-[#c4c4c4] bg-white px-1 py-1.5 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
                      />
                      <span className="text-xs">yd</span>
                    </div>
                  </div>

                  {/* Row 2: slider + ball input */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 flex items-center">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={currentBalls}
                        onChange={(e) => update(club.id, { balls: Number(e.target.value) })}
                        className="club-balls-slider w-full"
                      />
                    </div>
                    <div className="flex items-center gap-1 w-[72px] shrink-0">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={currentBalls || ""}
                        onChange={(e) =>
                          update(club.id, { balls: e.target.value ? Number(e.target.value) : 0 })
                        }
                        placeholder="—"
                        className="w-[52px] rounded-md border border-[#c4c4c4] bg-white px-1 py-1.5 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
                      />
                      <span className="text-xs">球</span>
                    </div>
                  </div>

                  {/* Row 3: memo toggle */}
                  <MemoToggle
                    hasMemo={entry?.memo != null}
                    memoValue={entry?.memo ?? null}
                    onMemoChange={(memo) => update(club.id, { memo })}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
