"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/practice/session-card";
import { usePracticeSessions } from "@/hooks/use-practice";

export default function PracticePage() {
  const { sessions, isLoading } = usePracticeSessions();

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">練習記録</h2>
        <Link href="/practice/new">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            記録する
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground">読み込み中...</p>
      ) : sessions.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          まだ練習記録がありません
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
