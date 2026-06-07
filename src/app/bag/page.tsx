"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClubCard } from "@/components/club/club-card";
import { StatusFilter } from "@/components/club/status-filter";
import { useClubs } from "@/hooks/use-clubs";
import type { ClubStatus } from "@/types/database";

const categoryOrder = ["driver", "fairway_wood", "utility", "iron", "wedge", "putter"];
const categoryLabels: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

export default function BagPage() {
  const [statusFilter, setStatusFilter] = useState<ClubStatus | "all">("active");
  const { clubs, isLoading } = useClubs(statusFilter === "all" ? undefined : statusFilter);

  const groupedClubs = categoryOrder
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      clubs: clubs.filter((c) => c.category === cat),
    }))
    .filter((g) => g.clubs.length > 0);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">マイバッグ</h2>
        <Link href="/bag/new">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            追加
          </Button>
        </Link>
      </div>

      <StatusFilter value={statusFilter} onChange={setStatusFilter} />

      {isLoading ? (
        <p className="text-center text-muted-foreground">読み込み中...</p>
      ) : clubs.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          クラブが登録されていません
        </p>
      ) : (
        <div className="space-y-6">
          {groupedClubs.map((group) => (
            <div key={group.category} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{group.label}</h3>
              <div className="space-y-2">
                {group.clubs.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
