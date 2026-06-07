"use client";

import { useAuth } from "@/hooks/use-auth";
import { liffLogout } from "@/lib/liff";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-4 p-4">
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

      <Separator />

      <Button variant="outline" className="w-full" onClick={liffLogout}>
        ログアウト
      </Button>
    </div>
  );
}
