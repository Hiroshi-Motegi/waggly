"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { isNative } from "@/lib/platform";
import { useClubs } from "@/hooks/use-clubs";
import { apiFetch } from "@/lib/api-client";

type ClubTab = "bag" | "bag2" | "reserve";

export default function NewPlanPage() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user && isNative()) {
    return (
      <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
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

  function toggleClub(clubNumber: string) {
    setSelectedClubs((prev) =>
      prev.includes(clubNumber)
        ? prev.filter((c) => c !== clubNumber)
        : [...prev, clubNumber]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsGenerating(true);
    setError("");

    // Fire and navigate - generation continues in background
    apiFetch("/api/coach/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "manual",
        duration,
        selectedClubs,
        focus,
        location,
        notes,
        referPractice,
        referPracticeMonths: referPractice === "none" ? 0 : referPractice === "last" ? 0 : parseInt(referPractice),
      }),
    }).catch(() => {});

    // Navigate immediately
    router.push("/coach/plans?generating=true");
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-4 p-2 pb-8">
      <h2 className="text-xl font-bold text-white">練習メニューを作成</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">練習条件</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Duration */}
            <div className="space-y-1">
              <label className="text-base font-medium">練習時間</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              >
                <option value="30分">30分</option>
                <option value="1時間">1時間</option>
                <option value="1.5時間">1.5時間</option>
                <option value="2時間">2時間</option>
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label className="text-base font-medium">練習場所</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              >
                <option value="練習場">練習場（屋外）</option>
                <option value="インドア">インドア練習場</option>
                <option value="コース前">コース前</option>
                <option value="自宅">自宅</option>
              </select>
            </div>

            {/* Focus */}
            <div className="space-y-1">
              <label className="text-base font-medium">重点的に練習したいこと</label>
              <Textarea
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="例: ドライバーの方向性、アプローチの距離感"
                rows={3}
                className="h-auto"
              />
            </div>

            {/* Refer practice records */}
            <div className="space-y-1">
              <label className="text-base font-medium">過去の練習記録を参考にする</label>
              <select
                value={referPractice}
                onChange={(e) => setReferPractice(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              >
                <option value="last">前回の練習記録から</option>
                <option value="1">直近1ヶ月</option>
                <option value="3">直近3ヶ月</option>
                <option value="6">直近6ヶ月</option>
                <option value="none">参考にしない</option>
              </select>
              <p className="text-sm text-muted-foreground">練習の傾向やメモをAIが分析して提案に活かします</p>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-base font-medium">その他の要望</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="その他、AIへの要望があれば"
                rows={2}
                className="h-auto"
              />
            </div>
          </CardContent>
        </Card>

        {/* Club selection */}
        {clubs.length > 0 && (() => {
          const allTabs: { value: ClubTab; label: string; clubs: typeof bag1 }[] = [
            { value: "bag", label: "マイバッグ", clubs: bag1 },
            { value: "bag2", label: "予備バッグ", clubs: bag2 },
            { value: "reserve", label: "予備", clubs: reserveClubs },
          ];
          const tabItems = allTabs.filter((t) => t.clubs.length > 0);
          const displayClubs = tabItems.find((t) => t.value === clubTab)?.clubs ?? bag1;
          const allSelected = displayClubs.every((c) => selectedClubs.includes(c.club_number));

          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">利用するクラブ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tabItems.length > 1 && (
                  <div className="flex gap-1">
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
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{selectedClubs.filter((cn) => displayClubs.some((c) => c.club_number === cn)).length}/{displayClubs.length}本選択</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nums = displayClubs.map((c) => c.club_number);
                      setSelectedClubs((prev) =>
                        allSelected
                          ? prev.filter((cn) => !nums.includes(cn))
                          : [...prev.filter((cn) => !nums.includes(cn)), ...nums]
                      );
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    {allSelected ? "すべて解除" : "すべて追加"}
                  </button>
                </div>
                <div className="columns-2 gap-2">
                  {displayClubs.map((club) => (
                    <label key={club.id} className="flex items-center gap-2 cursor-pointer py-1 break-inside-avoid">
                      <input
                        type="checkbox"
                        checked={selectedClubs.includes(club.club_number)}
                        onChange={() => toggleClub(club.club_number)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-base">{club.club_number}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {error && (
          <p className="text-base text-destructive text-center">{error}</p>
        )}

        <Button type="submit" className="w-full h-11" disabled={isGenerating}>
          {isGenerating ? "生成中..." : "メニューを生成"}
        </Button>
      </form>
      </div>
    </div>
  );
}

