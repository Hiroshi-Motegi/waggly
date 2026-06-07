"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusFilter } from "@/components/club/status-filter";
import { useClubs, updateClub } from "@/hooks/use-clubs";
import type { ClubStatus, ClubWithImages } from "@/types/database";
import { Badge } from "@/components/ui/badge";

const MAX_BAG_CLUBS = 14;

const statusLabels: Record<string, string> = {
  bag: "マイバッグ",
  reserve: "予備",
  sold: "売却済",
};

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

function ClubRow({
  club,
  showStatus,
  isReordering,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  club: ClubWithImages;
  showStatus?: boolean;
  isReordering?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const content = (
    <div className="flex items-center gap-2 rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors">
      {isReordering && (
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveUp?.(); }}
            disabled={isFirst}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveDown?.(); }}
            disabled={isLast}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      )}
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
  );

  if (isReordering) {
    return content;
  }

  return <Link href={`/bag/${club.id}`}>{content}</Link>;
}

export default function BagPage() {
  const [statusFilter, setStatusFilter] = useState<ClubStatus | "all">("bag");
  const { clubs, isLoading, refetch } = useClubs(statusFilter === "all" ? undefined : statusFilter);
  const [isReordering, setIsReordering] = useState(false);
  const [localClubs, setLocalClubs] = useState<ClubWithImages[]>([]);

  const isBagView = statusFilter === "bag";

  // Use localClubs during reorder, otherwise use fetched clubs
  const displayClubs = isReordering ? localClubs : (
    isBagView
      ? [...clubs].sort((a, b) => a.sort_order - b.sort_order)
      : clubs
  );

  const bagCount = isBagView ? clubs.length : null;

  function startReorder() {
    setLocalClubs([...clubs].sort((a, b) => a.sort_order - b.sort_order));
    setIsReordering(true);
  }

  async function saveOrder() {
    // Update sort_order for each club
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
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {isBagView && bagCount !== null
            ? `マイバッグ (${bagCount}/${MAX_BAG_CLUBS})`
            : "マイバッグ"}
        </h2>
        <div className="flex gap-2">
          {isBagView && !isReordering && clubs.length > 1 && (
            <Button size="sm" variant="outline" onClick={startReorder}>
              <GripVertical className="mr-1 h-4 w-4" />
              並替
            </Button>
          )}
          {!isReordering && (
            <Link href="/bag/new">
              <Button size="sm" disabled={isBagView && (bagCount ?? 0) >= MAX_BAG_CLUBS}>
                <Plus className="mr-1 h-4 w-4" />
                追加
              </Button>
            </Link>
          )}
        </div>
      </div>

      {isReordering ? (
        <>
          <div className="rounded-xl border bg-card overflow-hidden">
            {displayClubs.map((club, index) => (
              <div key={club.id}>
                <ClubRow
                  club={club}
                  isReordering
                  isFirst={index === 0}
                  isLast={index === displayClubs.length - 1}
                  onMoveUp={() => moveClub(index, "up")}
                  onMoveDown={() => moveClub(index, "down")}
                />
                {index < displayClubs.length - 1 && (
                  <div className="border-t mx-3" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={cancelReorder}>
              キャンセル
            </Button>
            <Button className="flex-1" onClick={saveOrder}>
              保存
            </Button>
          </div>
        </>
      ) : (
        <>
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />

          {isLoading ? (
            <p className="text-center text-muted-foreground">読み込み中...</p>
          ) : clubs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              クラブが登録されていません
            </p>
          ) : isBagView ? (
            <div className="rounded-xl border bg-card overflow-hidden">
              {displayClubs.map((club, index) => {
                const next = displayClubs[index + 1];
                const gap =
                  club.distance != null && next?.distance != null
                    ? club.distance - next.distance
                    : null;

                return (
                  <div key={club.id}>
                    <ClubRow club={club} />
                    {index < displayClubs.length - 1 && (
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
              {displayClubs.map((club, index) => (
                <div key={club.id}>
                  <ClubRow club={club} showStatus={statusFilter === "all"} />
                  {index < displayClubs.length - 1 && (
                    <div className="border-t mx-3" />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
