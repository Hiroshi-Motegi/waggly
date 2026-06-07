"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PracticeSessionWithClubs } from "@/types/database";

interface RecentPracticeProps {
  sessions: PracticeSessionWithClubs[];
}

export function RecentPractice({ sessions }: RecentPracticeProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">最近の練習</CardTitle>
          <Link href="/practice" className="text-xs text-muted-foreground hover:underline">
            すべて見る
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ記録がありません</p>
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{s.practiced_at}</p>
                  <p className="text-xs text-muted-foreground">{s.location || "場所未入力"}</p>
                </div>
                {s.total_balls && <Badge variant="secondary">{s.total_balls}球</Badge>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
