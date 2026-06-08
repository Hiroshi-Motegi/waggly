"use client";

import { useState } from "react";
import { ClubBallsInput, type ClubBallsValue } from "./club-balls-input";
import type { Club } from "@/types/database";

type BallsTab = "total" | "per_club";

interface SessionFormProps {
  clubs: Club[];
  reserveClubs?: Club[];
  pastLocations?: string[];
  initialData?: {
    practiced_at: string;
    location: string | null;
    total_balls: number | null;
    memo: string | null;
    rating?: number | null;
    practice_clubs?: { club_id: string; balls: number; avg_distance?: number | null }[];
  };
  showRating?: boolean;
  onSubmit: (data: {
    practiced_at: string;
    location: string;
    total_balls: number;
    memo: string;
    rating: number | null;
    clubs: { club_id: string; balls: number; avg_distance?: number | null }[];
  }) => void;
  isSubmitting?: boolean;
  showCancel?: boolean;
  onCancel?: () => void;
}

export function SessionForm({ clubs, reserveClubs, pastLocations, initialData, showRating, onSubmit, isSubmitting, showCancel, onCancel }: SessionFormProps) {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = jst.toISOString().split("T")[0];
  const [practicedAt, setPracticedAt] = useState(initialData?.practiced_at ?? today);
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [totalBalls, setTotalBalls] = useState(initialData?.total_balls ?? 0);
  const [clubBalls, setClubBalls] = useState<ClubBallsValue[]>(
    initialData?.practice_clubs ?? []
  );
  const [memo, setMemo] = useState(initialData?.memo ?? "");
  const [rating, setRating] = useState<number | null>(initialData?.rating ?? null);
  const [ballsTab, setBallsTab] = useState<BallsTab>(
    initialData?.practice_clubs && initialData.practice_clubs.length > 0 ? "per_club" : "total"
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const computedTotal = ballsTab === "per_club"
      ? clubBalls.reduce((sum, cb) => sum + cb.balls, 0)
      : totalBalls;
    onSubmit({
      practiced_at: practicedAt,
      location,
      total_balls: computedTotal,
      memo,
      rating,
      clubs: ballsTab === "per_club" ? clubBalls : [],
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col py-2 space-y-2">
      {/* Card 1: Date & Location */}
      <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-xs">日付</span>
          <input
            type="date"
            value={practicedAt}
            onChange={(e) => setPracticedAt(e.target.value)}
            className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
          />
        </div>
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-xs">練習場</span>
          <input
            list="past-locations"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="練習場名を入力"
            className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
          />
          {pastLocations && pastLocations.length > 0 && (
            <datalist id="past-locations">
              {pastLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          )}
        </div>
      </div>

      {/* Section title: 練習球数 */}
      <h3 className="px-1 pt-4 text-base font-bold text-white">練習球数</h3>

      {/* Card 2: Balls (tabbed) */}
      <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
        {/* Tabs */}
        <div className="flex items-end gap-0.5">
          <button
            type="button"
            onClick={() => setBallsTab("total")}
            className="flex flex-col items-center gap-0.5 pt-1"
          >
            <span className="px-2 py-0.5 text-sm font-bold text-[#006728]">総球数のみ</span>
            <div className={`h-0.5 w-full ${ballsTab === "total" ? "bg-[#006728]" : "bg-[#a5cbb4]"}`} />
          </button>
          <button
            type="button"
            onClick={() => setBallsTab("per_club")}
            className="flex flex-col items-center gap-0.5 pt-1"
          >
            <span className="px-2 py-0.5 text-sm font-bold text-[#006728]">番手別球数・飛距離</span>
            <div className={`h-0.5 w-full ${ballsTab === "per_club" ? "bg-[#006728]" : "bg-[#a5cbb4]"}`} />
          </button>
          <div className="h-0.5 flex-1 bg-[#ececec]" />
        </div>

        {/* Tab content */}
        {ballsTab === "total" ? (
          <div className="flex flex-col gap-1 py-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={300}
                  step={10}
                  value={totalBalls}
                  onChange={(e) => setTotalBalls(Number(e.target.value))}
                  className="club-balls-slider w-full"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  inputMode="numeric"
                  value={totalBalls || ""}
                  onChange={(e) => setTotalBalls(e.target.value ? Number(e.target.value) : 0)}
                  placeholder="—"
                  className="w-[52px] rounded-md border border-[#c4c4c4] bg-white px-1 py-1.5 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
                />
                <span className="text-xs">球</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <ClubBallsInput clubs={clubs} reserveClubs={reserveClubs} value={clubBalls} onChange={setClubBalls} />
            {clubBalls.length > 0 && (
              <p className="text-sm text-[#8b8b8b] pt-2">
                合計: {clubBalls.reduce((s, c) => s + c.balls, 0)}球
              </p>
            )}
          </div>
        )}
      </div>

      {/* Section title: 気づき・メモ */}
      <h3 className="px-1 pt-4 text-base font-bold text-white">気づき・メモ</h3>

      {/* Card 3: Rating & Memo */}
      <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
        {showRating !== false && (
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-xs">練習の評価</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className={`text-xl transition-colors ${
                    rating != null && star <= rating ? "text-amber-400" : "text-gray-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-xs">所感・メモ</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="今日の気づきや感覚をメモ..."
            rows={4}
            className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
          />
        </div>
      </div>

      {/* Buttons outside cards */}
      <div className="flex flex-col items-center gap-2 px-6 pt-4 pb-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-white border border-white py-2 text-sm font-bold text-[#006728] disabled:opacity-50"
        >
          {isSubmitting ? "保存中..." : "保存する"}
        </button>
        {showCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-1 text-sm font-bold text-white"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}
