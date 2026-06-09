"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useClubs } from "@/hooks/use-clubs";
import { apiFetch } from "@/lib/api-client";

export default function NewPlanPage() {
  const router = useRouter();
  const { clubs: bag1 } = useClubs("bag", 1);
  const { clubs: bag2 } = useClubs("bag", 2);
  const clubs = [...bag1, ...bag2];
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
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-4 p-2 pb-8">
      <h2 className="text-xl font-bold text-white">練習メニューを作成</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">練習条件</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Duration */}
            <div className="space-y-1">
              <label className="text-sm font-medium">練習時間</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="30分">30分</option>
                <option value="1時間">1時間</option>
                <option value="1.5時間">1.5時間</option>
                <option value="2時間">2時間</option>
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label className="text-sm font-medium">練習場所</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="練習場">練習場（屋外）</option>
                <option value="インドア">インドア練習場</option>
                <option value="コース前">コース前</option>
                <option value="自宅">自宅</option>
              </select>
            </div>

            {/* Focus */}
            <div className="space-y-1">
              <label className="text-sm font-medium">重点的に練習したいこと</label>
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
              <label className="text-sm font-medium">過去の練習記録を参考にする</label>
              <select
                value={referPractice}
                onChange={(e) => setReferPractice(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="last">前回の練習記録から</option>
                <option value="1">直近1ヶ月</option>
                <option value="3">直近3ヶ月</option>
                <option value="6">直近6ヶ月</option>
                <option value="none">参考にしない</option>
              </select>
              <p className="text-xs text-muted-foreground">練習の傾向やメモをAIが分析して提案に活かします</p>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-sm font-medium">その他の要望</label>
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
        {clubs.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">利用するクラブ</CardTitle>
                <button
                  type="button"
                  onClick={() => {
                    const allNumbers = clubs.map((c) => c.club_number);
                    setSelectedClubs((prev) =>
                      prev.length === allNumbers.length ? [] : allNumbers
                    );
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {selectedClubs.length === clubs.length ? "すべて解除" : "すべて追加"}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="columns-2 gap-2">
                {clubs.map((club) => (
                  <label key={club.id} className="flex items-center gap-2 cursor-pointer py-1 break-inside-avoid">
                    <input
                      type="checkbox"
                      checked={selectedClubs.includes(club.club_number)}
                      onChange={() => toggleClub(club.club_number)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">{club.club_number}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button type="submit" className="w-full h-11" disabled={isGenerating}>
          {isGenerating ? "生成中..." : "メニューを生成"}
        </Button>
      </form>
      </div>
    </div>
  );
}
