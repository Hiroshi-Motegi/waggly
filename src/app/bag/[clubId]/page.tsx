"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ClubSpecTable } from "@/components/club/club-spec-table";
import { useClub, deleteClub, updateClub } from "@/hooks/use-clubs";

const maintenanceTypeLabels: Record<string, string> = {
  grip_change: "グリップ交換",
  reshaft: "リシャフト",
  loft_adjust: "ロフト調整",
  other: "その他",
};

export default function ClubDetailPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const { club, isLoading } = useClub(clubId);
  const router = useRouter();

  async function handleStatusChange(newStatus: string) {
    await updateClub(clubId, { status: newStatus as any });
    router.push("/bag");
  }

  async function handleDelete() {
    if (!confirm("このクラブを削除しますか？")) return;
    await deleteClub(clubId);
    router.push("/bag");
  }

  if (isLoading) return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  if (!club) return <p className="p-4 text-center text-muted-foreground">クラブが見つかりません</p>;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{club.club_number}</h2>
          <p className="text-muted-foreground">
            {[club.maker, club.model].filter(Boolean).join(" ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/bag/${clubId}/edit`}>
            <Button variant="outline" size="icon"><Pencil className="h-4 w-4" /></Button>
          </Link>
          <Button variant="outline" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Change */}
      <div className="flex gap-2">
        {club.status !== "bag" && (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleStatusChange("bag")}>
            マイバッグに入れる
          </Button>
        )}
        {club.status !== "reserve" && (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleStatusChange("reserve")}>
            予備にする
          </Button>
        )}
        {club.status !== "sold" && (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleStatusChange("sold")}>
            売却済みにする
          </Button>
        )}
      </div>

      {/* Specs */}
      <Card>
        <CardHeader><CardTitle className="text-base">スペック</CardTitle></CardHeader>
        <CardContent><ClubSpecTable club={club} /></CardContent>
      </Card>

      {/* Purchase Info */}
      {(club.purchase_date || club.purchase_shop || club.purchase_price) && (
        <Card>
          <CardHeader><CardTitle className="text-base">購入情報</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {club.purchase_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">購入日</span>
                <span>{club.purchase_date}</span>
              </div>
            )}
            {club.purchase_shop && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">購入店</span>
                <span>{club.purchase_shop}</span>
              </div>
            )}
            {club.purchase_price != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">価格</span>
                <span className="font-medium">{club.purchase_price.toLocaleString()}円</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Maintenance History */}
      <Card>
        <CardHeader><CardTitle className="text-base">メンテナンス履歴</CardTitle></CardHeader>
        <CardContent>
          {club.maintenances?.length === 0 ? (
            <p className="text-sm text-muted-foreground">記録なし</p>
          ) : (
            <div className="space-y-3">
              {club.maintenances?.map((m: any) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{maintenanceTypeLabels[m.type]}</Badge>
                    <span className="text-xs text-muted-foreground">{m.done_at}</span>
                  </div>
                  {m.description && <p className="mt-1 text-sm">{m.description}</p>}
                  <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                    {m.shop && <span>{m.shop}</span>}
                    {m.cost != null && <span>{m.cost.toLocaleString()}円</span>}
                  </div>
                  <Separator className="mt-3" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
