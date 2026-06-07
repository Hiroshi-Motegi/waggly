"use client";

import { useClubs } from "@/hooks/use-clubs";
import { usePracticeSessions } from "@/hooks/use-practice";
import { useAuth } from "@/hooks/use-auth";
import { BagSummary } from "@/components/home/bag-summary";
import { RecentPractice } from "@/components/home/recent-practice";
import { GapAnalysisCard } from "@/components/home/gap-analysis-card";
import { analyzeGaps } from "@/lib/gap-analysis";

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { clubs } = useClubs("bag");
  const { sessions } = usePracticeSessions();

  if (authLoading) {
    return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">LINEでログインしてください</p>
      </div>
    );
  }

  const gapResult = analyzeGaps(clubs);

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h2 className="text-xl font-bold">こんにちは、{user.display_name}さん</h2>
      <BagSummary clubs={clubs} />
      <GapAnalysisCard result={gapResult} />
      <RecentPractice sessions={sessions} />
    </div>
  );
}
