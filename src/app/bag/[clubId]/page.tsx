"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClubSpecTable } from "@/components/club/club-spec-table";
import { useClub, deleteClub, updateClub } from "@/hooks/use-clubs";

const maintenanceTypeLabels: Record<string, string> = {
  grip_change: "グリップ交換",
  reshaft: "リシャフト",
  loft_adjust: "ロフト調整",
  other: "その他",
};

const maintenanceTypes = [
  { value: "grip_change", label: "グリップ交換" },
  { value: "reshaft", label: "リシャフト" },
  { value: "loft_adjust", label: "ロフト調整" },
  { value: "other", label: "その他" },
];

export default function ClubDetailPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const { club, isLoading } = useClub(clubId);
  const router = useRouter();
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);
  const [mForm, setMForm] = useState({
    type: "grip_change",
    description: "",
    shop: "",
    cost: "",
    done_at: new Date().toISOString().split("T")[0],
  });

  async function handleStatusChange(newStatus: string) {
    await updateClub(clubId, { status: newStatus as any });
    router.push("/bag");
  }

  async function handleDelete() {
    if (!confirm("このクラブを削除しますか？")) return;
    await deleteClub(clubId);
    router.push("/bag");
  }

  async function handleMaintenanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMaintenanceSubmitting(true);
    try {
      const res = await fetch("/api/maintenances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          club_id: clubId,
          type: mForm.type,
          description: mForm.description || null,
          shop: mForm.shop || null,
          cost: mForm.cost ? Number(mForm.cost) : null,
          done_at: mForm.done_at,
        }),
      });
      if (!res.ok) throw new Error("Failed to create maintenance");
      setShowMaintenanceForm(false);
      setMForm({ type: "grip_change", description: "", shop: "", cost: "", done_at: new Date().toISOString().split("T")[0] });
      // Reload page to show new maintenance
      window.location.reload();
    } catch (error) {
      console.error("Failed to create maintenance:", error);
    } finally {
      setMaintenanceSubmitting(false);
    }
  }

  if (isLoading) return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  if (!club) return <p className="p-4 text-center text-muted-foreground">クラブが見つかりません</p>;

  return (
    <div className="space-y-4 p-4 pb-8">
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">メンテナンス履歴</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}>
              <Plus className="mr-1 h-4 w-4" />
              追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Maintenance Form */}
          {showMaintenanceForm && (
            <form onSubmit={handleMaintenanceSubmit} className="space-y-3 mb-4 p-3 rounded-lg border bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="m-type">種別</Label>
                <select
                  id="m-type"
                  value={mForm.type}
                  onChange={(e) => setMForm({ ...mForm, type: e.target.value })}
                  className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {maintenanceTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-done_at">実施日</Label>
                <Input
                  id="m-done_at"
                  type="date"
                  value={mForm.done_at}
                  onChange={(e) => setMForm({ ...mForm, done_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-shop">実施店舗</Label>
                <Input
                  id="m-shop"
                  value={mForm.shop}
                  onChange={(e) => setMForm({ ...mForm, shop: e.target.value })}
                  placeholder="例: ゴルフ5 新宿店"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-cost">費用 (円)</Label>
                <Input
                  id="m-cost"
                  type="number"
                  value={mForm.cost}
                  onChange={(e) => setMForm({ ...mForm, cost: e.target.value })}
                  placeholder="3000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-description">メモ</Label>
                <Textarea
                  id="m-description"
                  value={mForm.description}
                  onChange={(e) => setMForm({ ...mForm, description: e.target.value })}
                  placeholder="詳細メモ..."
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowMaintenanceForm(false)}>
                  キャンセル
                </Button>
                <Button type="submit" className="flex-1" disabled={maintenanceSubmitting}>
                  {maintenanceSubmitting ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          )}

          {club.maintenances?.length === 0 && !showMaintenanceForm ? (
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
