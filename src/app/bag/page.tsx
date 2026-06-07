"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusFilter } from "@/components/club/status-filter";
import { useClubs } from "@/hooks/use-clubs";
import type { ClubStatus, ClubWithImages } from "@/types/database";

const MAX_BAG_CLUBS = 14;

function GapIndicator({ gap }: { gap: number }) {
  return (
    <div className="flex items-center gap-2 py-0.5 pl-12">
      <div className="flex flex-col items-center">
        <div className="h-3 w-px bg-border" />
      </div>
      <span className="text-xs text-muted-foreground">{gap} yds</span>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";

const statusLabels: Record<string, string> = {
  bag: "マイバッグ",
  reserve: "予備",
  sold: "売却済",
};

function ClubRow({ club, showStatus }: { club: ClubWithImages; showStatus?: boolean }) {
  return (
    <Link href={`/bag/${club.id}`}>
      <div className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors">
        <div className="w-10 shrink-0 text-center">
          <span className="text-sm font-semibold">{club.club_number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium leading-tight truncate">
              {club.model ?? "—"}
            </p>
            {showStatus && club.status !== "bag" && (
              <Badge variant={club.status === "reserve" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                {statusLabels[club.status]}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {club.maker ?? "—"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {club.distance != null ? (
            <>
              <p className="text-sm font-semibold">{club.distance}</p>
              <p className="text-xs text-muted-foreground">yds</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function BagPage() {
  const [statusFilter, setStatusFilter] = useState<ClubStatus | "all">("bag");
  const { clubs, isLoading } = useClubs(statusFilter === "all" ? undefined : statusFilter);

  const isBagView = statusFilter === "bag";

  // For bag view: sort by distance descending (clubs without distance go last)
  const sortedClubs = isBagView
    ? [...clubs].sort((a, b) => {
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return b.distance - a.distance;
      })
    : clubs;

  const bagCount = isBagView ? clubs.length : null;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {isBagView && bagCount !== null
            ? `マイバッグ (${bagCount}/${MAX_BAG_CLUBS})`
            : "マイバッグ"}
        </h2>
        <Link href="/bag/new">
          <Button size="sm" disabled={isBagView && (bagCount ?? 0) >= MAX_BAG_CLUBS}>
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
      ) : isBagView ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          {sortedClubs.map((club, index) => {
            const next = sortedClubs[index + 1];
            const gap =
              club.distance != null && next?.distance != null
                ? club.distance - next.distance
                : null;

            return (
              <div key={club.id}>
                <ClubRow club={club} />
                {index < sortedClubs.length - 1 && (
                  <div className="border-t mx-3" />
                )}
                {gap !== null && gap > 0 && (
                  <GapIndicator gap={gap} />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          {sortedClubs.map((club, index) => (
            <div key={club.id}>
              <ClubRow club={club} showStatus={statusFilter === "all"} />
              {index < sortedClubs.length - 1 && (
                <div className="border-t mx-3" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
