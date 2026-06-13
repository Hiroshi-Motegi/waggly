"use client";
import { Loading } from "@/components/loading";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { apiFetch } from "@/lib/api-client";
import { useClub } from "@/hooks/use-clubs";
import type { Maintenance } from "@/types/database";
import { nativeHref } from "@/lib/native-routes";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function MaintenanceListPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddMode = searchParams.get("add") === "1";
  const { club, isLoading } = useClub(clubId);
  const [items, setItems] = useState<Maintenance[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [showForm, setShowForm] = useState(isAddMode);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "grip_change",
    description: "",
    shop: "",
    cost: "",
    done_at: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (!club || isAddMode) return;
    setItemsLoading(true);
    apiFetch(`/api/clubs/${clubId}/maintenances`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false));
  }, [clubId, club]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/clubs/${clubId}/maintenances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          description: form.description || null,
          shop: form.shop || null,
          cost: form.cost ? Number(form.cost) : null,
          done_at: form.done_at,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      if (isAddMode) {
        router.push(nativeHref(`/bag/${clubId}`));
        return;
      }
      const newItem = await res.json();
      setItems((prev) => [newItem, ...prev]);
      setShowForm(false);
      setForm({ type: "grip_change", description: "", shop: "", cost: "", done_at: new Date().toISOString().split("T")[0] });
    } catch (error) {
      console.error("Failed to create maintenance:", error);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <Loading variant="light" />;
  if (!club) return <div className="px-2 pt-16"><div className="rounded-lg bg-white p-6 text-center"><p className="text-base text-[#8b8b8b]">クラブが見つかりません</p></div></div>;

  const inputClass = "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

  // Add mode: dedicated form page
  if (isAddMode) {
    return (
      <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
        {submitting && <ProcessingOverlay />}
        <div className="relative z-10 flex flex-col space-y-2">
          <form onSubmit={handleSubmit} className="flex flex-col" style={{ minHeight: "calc(100dvh - var(--bottom-nav-height))" }}>
            <PageHeader
              title="メンテナンス記録の追加"
              subtitle={`${club.club_number}${club.maker ? ` / ${club.maker}` : ""}${club.model ? ` ${club.model}` : ""}`}
              variant="dark"
            />
            <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
              <div className="flex flex-col gap-0.5 py-1">
                <span className="text-sm">種別</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className={inputClass}
                >
                  {maintenanceTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-0.5 py-1">
                <span className="text-sm">実施日</span>
                <input type="date" value={form.done_at} onChange={(e) => setForm({ ...form, done_at: e.target.value })} className={inputClass} />
              </div>
              <div className="flex flex-col gap-0.5 py-1">
                <span className="text-sm">実施店舗</span>
                <input value={form.shop} onChange={(e) => setForm({ ...form, shop: e.target.value })} placeholder="例: ゴルフ5 新宿店" className={inputClass} />
              </div>
              <div className="flex flex-col gap-0.5 py-1">
                <span className="text-sm">費用（円）</span>
                <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="3000" className={inputClass} />
              </div>
              <div className="flex flex-col gap-0.5 py-1">
                <span className="text-sm">メモ</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="詳細メモ..."
                  rows={5}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex flex-col items-center gap-4 px-4 pt-6 pb-8">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-white py-3 text-base font-bold text-[#006728] disabled:opacity-50"
              >
                {submitting ? "保存中..." : "保存する"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="text-base font-bold text-white"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // List mode
  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      {submitting && <ProcessingOverlay />}
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="メンテナンス履歴" subtitle={club.club_number} variant="dark">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-full bg-white px-3 h-[40px] text-sm font-bold text-[#006728]"
        >
          <Plus className="h-3 w-3" />
          追加
        </button>
      </PageHeader>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg bg-white p-3">
          <div className="space-y-1">
            <span className="text-sm">種別</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className={inputClass}
            >
              {maintenanceTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-sm">実施日</span>
            <input type="date" value={form.done_at} onChange={(e) => setForm({ ...form, done_at: e.target.value })} className={inputClass} />
          </div>
          <div className="space-y-1">
            <span className="text-sm">実施店舗</span>
            <input value={form.shop} onChange={(e) => setForm({ ...form, shop: e.target.value })} placeholder="例: ゴルフ5 新宿店" className={inputClass} />
          </div>
          <div className="space-y-1">
            <span className="text-sm">費用（円）</span>
            <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="3000" className={inputClass} />
          </div>
          <div className="space-y-1">
            <span className="text-sm">メモ</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="詳細メモ..." rows={3} className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-full border border-white py-2 text-base font-bold text-white">
              キャンセル
            </button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-full bg-[#006728] py-2 text-base font-bold text-white disabled:opacity-50">
              {submitting ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col rounded-lg bg-white p-3">
        {itemsLoading ? (
          <div className="flex flex-col gap-3 py-2 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <div className="h-4 w-16 rounded-full bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                </div>
                <div className="h-4 w-1/2 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-base text-[#8b8b8b]">記録なし</p>
        ) : (
          <div className="flex flex-col">
            {items.map((m, i) => (
              <Link key={m.id} href={nativeHref(`/bag/${clubId}/maintenances/${m.id}`)}>
                <div
                  className={`flex items-center gap-2.5 py-2 ${
                    i < items.length - 1 ? "border-b border-[#dfdfdf]" : ""
                  }`}
                >
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#c7e2ca] px-2.5 py-1 text-xs font-bold text-black">
                        {maintenanceTypeLabels[m.type]}
                      </span>
                      <span className="text-sm text-[#8b8b8b]">{formatDate(m.done_at)}</span>
                    </div>
                    {m.description && <p className="text-base truncate">{m.description}</p>}
                    <div className="flex gap-4 text-sm text-[#8b8b8b]">
                      {m.shop && <span>{m.shop}</span>}
                      {m.cost != null && <span>{m.cost.toLocaleString()}円</span>}
                    </div>
                  </div>
                  <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="shrink-0 opacity-60" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
