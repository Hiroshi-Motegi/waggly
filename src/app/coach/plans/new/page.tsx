"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { isNative } from "@/lib/platform";
import { useClubs } from "@/hooks/use-clubs";
import { apiFetch } from "@/lib/api-client";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";

type ClubTab = "bag" | "bag2" | "reserve";

export default function NewPlanPage() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user && isNative()) {
    return (
      <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
        <div className="relative z-10 flex flex-col space-y-2">
          <div className="rounded-lg bg-white p-6 text-center mt-4">
            <p className="text-base font-bold mb-2">AI練習メニューを利用するにはサインインが必要です</p>
            <p className="text-sm text-[#8b8b8b] mb-4">設定画面からGoogleアカウントでサインインしてください</p>
            <Link href="/settings" className="inline-block rounded-full bg-[#006728] px-6 py-2 text-base font-bold text-white">設定へ</Link>
          </div>
        </div>
      </div>
    );
  }
  const { clubs: bag1 } = useClubs("bag", 1);
  const { clubs: bag2 } = useClubs("bag", 2);
  const { clubs: reserveClubs } = useClubs("reserve");
  const clubs = [...bag1, ...bag2, ...reserveClubs];
  const [clubTab, setClubTab] = useState<ClubTab>("bag");
  const [duration, setDuration] = useState("1時間");
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [focus, setFocus] = useState("");
  const [location, setLocation] = useState("練習場");
  const [notes, setNotes] = useState("");
  const [referPractice, setReferPractice] = useState("last");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  function toggleClub(clubId: string) {
    setSelectedClubs((prev) =>
      prev.includes(clubId)
        ? prev.filter((c) => c !== clubId)
        : [...prev, clubId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (clubs.length === 0 && !focus.trim() && !notes.trim() && referPractice === "none") {
      setError("練習メニューを生成するには、クラブの登録、練習したいことの入力、または過去の練習記録の参考設定のいずれかが必要です。");
      return;
    }

    setIsGenerating(true);

    // Fire and navigate - generation continues in background
    const res = await apiFetch("/api/coach/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "auto",
        duration,
        selectedClubs: selectedClubs.map((id) => clubs.find((c) => c.id === id)?.club_number).filter(Boolean),
        focus,
        location,
        notes,
        referPractice,
        referPracticeMonths: referPractice === "none" ? 0 : referPractice === "last" ? 0 : parseInt(referPractice),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "生成に失敗しました");
      setIsGenerating(false);
      return;
    }

    router.push("/coach/plans");
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      {isGenerating && <ProcessingOverlay message="練習メニューを生成中..." />}
      <div className="relative z-10 flex flex-col space-y-2 pb-8">
      <PageHeader title="練習メニューを作成" variant="dark" />

      <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}
        <h3 className="px-1 pt-2 text-lg font-bold text-white">練習条件</h3>
        <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">練習時間</span>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
            >
              <option value="30分">30分</option>
              <option value="1時間">1時間</option>
              <option value="1.5時間">1.5時間</option>
              <option value="2時間">2時間</option>
            </select>
          </div>

          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">練習場所</span>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
            >
              <option value="練習場">練習場（屋外）</option>
              <option value="インドア">インドア練習場</option>
              <option value="コース前">コース前</option>
              <option value="自宅">自宅</option>
            </select>
          </div>

          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">重点的に練習したいこと</span>
            <textarea
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="例: ドライバーの方向性、アプローチの距離感"
              rows={3}
              className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
            />
          </div>

          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">過去の練習記録を参考にする</span>
            <select
              value={referPractice}
              onChange={(e) => setReferPractice(e.target.value)}
              className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
            >
              <option value="last">前回の練習記録から</option>
              <option value="1">直近1ヶ月</option>
              <option value="3">直近3ヶ月</option>
              <option value="6">直近6ヶ月</option>
              <option value="none">参考にしない</option>
            </select>
            <p className="text-xs text-[#8b8b8b]">練習の傾向やメモをAIが分析して提案に活かします</p>
          </div>

          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">その他の要望</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="その他、AIへの要望があれば"
              rows={2}
              className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
            />
          </div>
        </div>

        {/* Club selection */}
        {clubs.length > 0 && (() => {
          const allTabs: { value: ClubTab; label: string; clubs: typeof bag1 }[] = [
            { value: "bag", label: "マイバッグ", clubs: bag1 },
            { value: "bag2", label: "予備バッグ", clubs: bag2 },
            { value: "reserve", label: "保管庫", clubs: reserveClubs },
          ];
          const tabItems = allTabs.filter((t) => t.clubs.length > 0);
          const displayClubs = tabItems.find((t) => t.value === clubTab)?.clubs ?? bag1;
          const allSelected = displayClubs.every((c) => selectedClubs.includes(c.id));

          const categoryOrder = ["driver", "fairway_wood", "utility", "iron", "wedge", "putter"];
          const categoryLabels: Record<string, string> = {
            driver: "ドライバー", fairway_wood: "フェアウェイウッド", utility: "ユーティリティ",
            iron: "アイアン", wedge: "ウェッジ", putter: "パター",
          };
          const groups = categoryOrder
            .map((cat) => ({ label: categoryLabels[cat] ?? cat, clubs: displayClubs.filter((c) => c.category === cat) }))
            .filter((g) => g.clubs.length > 0);

          return (
            <>
              <h3 className="px-1 pt-2 text-lg font-bold text-white">利用するクラブ</h3>
              <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
                {tabItems.length > 1 && (
                  <div className="flex gap-1 pb-1">
                    {tabItems.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setClubTab(t.value)}
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          clubTab === t.value ? "bg-[#006728] text-white" : "border border-[#c4c4c4] text-[#8b8b8b]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-[#8b8b8b]">{selectedClubs.filter((id) => displayClubs.some((c) => c.id === id)).length}/{displayClubs.length}本選択</span>
                  <button
                    type="button"
                    onClick={() => {
                      const ids = displayClubs.map((c) => c.id);
                      setSelectedClubs((prev) =>
                        allSelected
                          ? prev.filter((id) => !ids.includes(id))
                          : [...prev.filter((id) => !ids.includes(id)), ...ids]
                      );
                    }}
                    className="text-sm font-bold text-[#006728]"
                  >
                    {allSelected ? "すべて解除" : "すべて追加"}
                  </button>
                </div>

                {groups.map((group) => (
                  <div key={group.label}>
                    <p className="text-sm font-bold text-[#006728] pb-1.5 pt-1">{group.label}</p>
                    <div className="flex flex-col rounded-lg bg-[#f8faf8] px-3">
                      {group.clubs.map((club, i) => {
                        const subLabel = [club.maker, club.model].filter(Boolean).join(" ");
                        return (
                          <label
                            key={club.id}
                            className={`flex items-center gap-2 py-3 cursor-pointer ${i < group.clubs.length - 1 ? "border-b border-[#e8e8e8]" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedClubs.includes(club.id)}
                              onChange={() => toggleClub(club.id)}
                              className="h-4 w-4 rounded accent-[#006728]"
                            />
                            <span className="bg-[#006728] text-white text-xs font-bold rounded-md px-2 py-0.5 shrink-0 min-w-[32px] text-center">{club.club_number}</span>
                            <span className="flex-1 text-base text-[#6c6c6c] truncate">{subLabel || "—"}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}

        <div className="flex flex-col items-center gap-4 px-4 pt-6 pb-8">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full rounded-full bg-white py-3 text-base font-bold text-[#006728] disabled:opacity-50"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                生成中...
              </span>
            ) : "練習メニューを生成"}
          </button>
          <p className="text-xs text-white/80 text-center">※ 1回あたり約3,000〜5,000 AIトークンを消費します</p>
        </div>
      </form>
      </div>
    </div>
  );
}

