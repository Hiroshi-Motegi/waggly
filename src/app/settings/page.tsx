"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { liffLogout } from "@/lib/liff";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface UsageData {
  month: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  limit: number;
  remaining: number;
  limitReached: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/usage")
      .then((res) => res.ok ? res.json() : null)
      .then(setUsage)
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const usagePercent = usage ? Math.min(100, Math.round((usage.totalTokens / usage.limit) * 100)) : 0;

  return (
    <div className="space-y-4 px-4 py-6">
      <h2 className="text-xl font-bold">設定</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">プロフィール</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg">{user.display_name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{user.display_name}</p>
            <p className="text-sm text-muted-foreground">LINE連携済み</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AIコーチ利用状況</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {usage ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{usage.month}月</span>
                <span className="font-medium">
                  {usage.totalTokens.toLocaleString()} / {usage.limit.toLocaleString()} トークン
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePercent >= 90 ? "bg-destructive" : usagePercent >= 70 ? "bg-yellow-500" : "bg-primary"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>使用率 {usagePercent}%</span>
                <span>残り {usage.remaining.toLocaleString()} トークン</span>
              </div>
              {usage.limitReached && (
                <p className="text-sm text-destructive font-medium">
                  今月の利用上限に達しました。来月リセットされます。
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Button variant="outline" className="w-full" onClick={liffLogout}>
        ログアウト
      </Button>
    </div>
  );
}
