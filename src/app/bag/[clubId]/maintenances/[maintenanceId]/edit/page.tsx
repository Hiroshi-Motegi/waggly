"use client";

import { Loading } from "@/components/loading";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClub } from "@/hooks/use-clubs";
import type { Maintenance } from "@/types/database";

const maintenanceTypes = [
  { value: "grip_change", label: "グリップ交換" },
  { value: "reshaft", label: "リシャフト" },
  { value: "loft_adjust", label: "ロフト調整" },
  { value: "other", label: "その他" },
];

export default function MaintenanceEditPage({
  params,
}: {
  params: Promise<{ clubId: string; maintenanceId: string }>;
}) {
  const { clubId, maintenanceId } = use(params);
  const { club } = useClub(clubId);
  const router = useRouter();
  const [isFetching, setIsFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "grip_change",
    description: "",
    shop: "",
    cost: "",
    done_at: "",
  });

  useEffect(() => {
    fetch(`/api/clubs/${clubId}/maintenances/${maintenanceId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Maintenance | null) => {
        if (data) {
          setForm({
            type: data.type,
            description: data.description ?? "",
            shop: data.shop ?? "",
            cost: data.cost?.toString() ?? "",
            done_at: data.done_at,
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, [clubId, maintenanceId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/maintenances/${maintenanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          description: form.description || null,
          shop: form.shop || null,
          cost: form.cost ? Number(form.cost) : null,
          done_at: form.done_at,
        }),
      });
      if (res.ok) router.push(`/bag/${clubId}/maintenances/${maintenanceId}`);
    } catch (error) {
      console.error("Failed to update maintenance:", error);
    } finally {
      setSubmitting(false);
    }
  }

  if (isFetching) return <Loading />;

  return (
    <div className="flex flex-col px-2 py-2 space-y-2">
      <div className="px-1">
        <span className="text-xs font-bold text-[#1e944c]">{club?.club_number}</span>
        <h2 className="text-lg font-bold text-[#006728]">メンテナンスを編集</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg bg-white p-4">
        <div className="space-y-1">
          <Label htmlFor="m-type" className="text-xs">種別</Label>
          <select
            id="m-type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="flex h-10 w-full rounded-md border border-[#72937f] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
          >
            {maintenanceTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-done_at" className="text-xs">実施日</Label>
          <Input id="m-done_at" type="date" value={form.done_at} onChange={(e) => setForm({ ...form, done_at: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-shop" className="text-xs">実施店舗</Label>
          <Input id="m-shop" value={form.shop} onChange={(e) => setForm({ ...form, shop: e.target.value })} placeholder="例: ゴルフ5 新宿店" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-cost" className="text-xs">費用 (円)</Label>
          <Input id="m-cost" type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="3000" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-desc" className="text-xs">メモ</Label>
          <Textarea id="m-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="詳細メモ..." rows={3} />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-full border border-[#006728] py-2 text-sm font-bold text-[#006728]"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-full bg-[#006728] py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
