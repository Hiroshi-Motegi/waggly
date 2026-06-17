"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Unlock, ExternalLink, Search } from "lucide-react";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { useAdminOne } from "@/hooks/admin/use-admin-list";
import { useSeriesActions } from "@/hooks/admin/use-series-actions";
import { apiFetch } from "@/lib/api-client";

/* ── Types ── */

interface Series {
  id: string;
  maker: string;
  model: string;
  image_url: string | null;
  affiliate_url: string | null;
  verified: boolean;
  source: string;
  spec_count: number;
  specs: {
    id: string;
    category: string;
    club_number: string | null;
    loft: number | null;
    lie: number | null;
    head_volume: number | null;
    head_weight: number | null;
    distance: number | null;
    length: number | null;
    total_weight: number | null;
    swing_weight: string | null;
    verified: boolean;
  }[];
}

/* ── Constants ── */

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

/* ── Component ── */

export default function SeriesEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: series, mutate, isLoading } = useAdminOne<Series>("series", id);
  const { updateSeries, lookupRakuten, toggleVerified } = useSeriesActions(id, () => mutate());

  const [form, setForm] = useState({ maker: "", model: "", image_url: "", affiliate_url: "" });
  const [saving, setSaving] = useState(false);
  const [rakutenUrl, setRakutenUrl] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  // Sync form from data
  useEffect(() => {
    if (series) {
      setForm({
        maker: series.maker ?? "",
        model: series.model ?? "",
        image_url: series.image_url ?? "",
        affiliate_url: series.affiliate_url ?? "",
      });
    }
  }, [series]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateSeries({
        maker: form.maker,
        model: form.model,
        image_url: form.image_url || null,
        affiliate_url: form.affiliate_url || null,
      });
      await mutate();
    } finally {
      setSaving(false);
    }
  }

  async function handleRakutenLookup() {
    if (!rakutenUrl.includes("rakuten.co.jp")) return;
    setLookingUp(true);
    try {
      await lookupRakuten(rakutenUrl);
      await mutate();
      setRakutenUrl("");
    } finally {
      setLookingUp(false);
    }
  }

  async function handleToggleVerified() {
    if (!series) return;
    await toggleVerified(series.verified);
    await mutate();
  }

  async function handleDelete() {
    if (!series) return;
    if (!confirm(`「${series.maker} ${series.model}」シリーズを削除しますか？`)) return;
    await apiFetch("/api/admin/series", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: series.id }),
    });
    router.push("/admin/series");
  }

  /* ── Loading ── */

  if (isLoading || !series) return <div className="p-6 text-[#8b8b8b]">読み込み中...</div>;

  /* ── Derived values ── */

  const titleText = `${series.maker} ${series.model}`.trim();
  const searchKeyword = `${form.maker} ${form.model} スペック`;

  return (
    <div className="space-y-4 p-4">
      {/* Breadcrumb */}
      <AdminBreadcrumb
        items={[
          { label: "シリーズ", href: "/admin/series" },
          { label: titleText },
        ]}
      />

      {/* Title + save button */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#333]">{titleText}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-[#006728] px-6 py-1.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      {/* 2-column layout */}
      <div className="flex gap-4">
        {/* ── Left column ── */}
        <div className="w-40 shrink-0 space-y-3">
          {/* Product image */}
          <div className="rounded-lg bg-[#f5f5f5] p-2">
            <img
              src={series.image_url ?? "/no-images/etc.png"}
              alt={titleText}
              className="w-full aspect-square object-contain"
            />
          </div>

          {/* Lock/Unlock button */}
          <button
            onClick={handleToggleVerified}
            className={`flex w-full items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
              series.verified
                ? "bg-[#006728] text-white"
                : "border border-[#dfdfdf] bg-white text-[#8b8b8b]"
            }`}
          >
            {series.verified ? <Lock size={12} /> : <Unlock size={12} />}
            {series.verified ? "Locked" : "Unlocked"}
          </button>

          {/* Source badge */}
          <div className="text-center">
            <span className="inline-block rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] text-[#8b8b8b]">
              {series.source}
            </span>
          </div>

          {/* Spec count */}
          <div className="text-center text-[10px] text-[#8b8b8b]">
            スペック: {series.spec_count}件
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex-1 space-y-4">
          {/* 基本情報 */}
          <AdminFormSection title="基本情報">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">メーカー</label>
                <input
                  type="text"
                  value={form.maker}
                  onChange={(e) => setForm((p) => ({ ...p, maker: e.target.value }))}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">モデル</label>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
            </div>

            {/* Search links */}
            <div className="flex items-center gap-3 pt-1">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <Search size={12} />Google<ExternalLink size={10} />
              </a>
              <a
                href={`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(`${form.maker} ${form.model}`.trim())}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[#bf0000] hover:underline"
              >
                <Search size={12} />楽天<ExternalLink size={10} />
              </a>
            </div>
          </AdminFormSection>

          {/* 画像・リンク */}
          <AdminFormSection title="画像・リンク">
            {/* Rakuten lookup */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[#8b8b8b]">楽天商品URLから取得</label>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={rakutenUrl}
                  onChange={(e) => setRakutenUrl(e.target.value)}
                  className="flex-1 rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="https://item.rakuten.co.jp/..."
                />
                <button
                  onClick={handleRakutenLookup}
                  disabled={lookingUp || !rakutenUrl.includes("rakuten.co.jp")}
                  className="shrink-0 rounded px-3 py-1.5 text-xs font-bold text-white bg-[#bf0000] disabled:opacity-40"
                >
                  {lookingUp ? "取得中..." : "取得"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[#8b8b8b]">画像URL</label>
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                placeholder="-"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[#8b8b8b]">アフィリエイトURL</label>
              <input
                type="url"
                value={form.affiliate_url}
                onChange={(e) => setForm((p) => ({ ...p, affiliate_url: e.target.value }))}
                className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                placeholder="-"
              />
            </div>
          </AdminFormSection>

          {/* 紐づきスペック */}
          <AdminFormSection title={`紐づきスペック (${series.spec_count}件)`}>
            {series.specs.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-[#e5e5e5]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
                      <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">番手</th>
                      <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">ロフト</th>
                      <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">ライ角</th>
                      <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">体積</th>
                      <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">飛距離</th>
                      <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">長さ</th>
                      <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">重量</th>
                      <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">バランス</th>
                      <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">状態</th>
                      <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.specs.map((sp) => (
                      <tr key={sp.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                        <td className="px-3 py-2 font-medium">
                          {CATEGORY_LABELS[sp.category] ?? sp.category}
                          {sp.club_number ? ` ${sp.club_number}` : ""}
                        </td>
                        <td className="px-3 py-2">{sp.loft != null ? `${sp.loft}°` : "-"}</td>
                        <td className="px-3 py-2">{sp.lie != null ? `${sp.lie}°` : "-"}</td>
                        <td className="px-3 py-2">{sp.head_volume != null ? `${sp.head_volume}cc` : "-"}</td>
                        <td className="px-3 py-2">{sp.distance != null ? `${sp.distance}yd` : "-"}</td>
                        <td className="px-3 py-2">{sp.length != null ? `${sp.length}"` : "-"}</td>
                        <td className="px-3 py-2">{sp.total_weight != null ? `${sp.total_weight}g` : "-"}</td>
                        <td className="px-3 py-2">{sp.swing_weight ?? "-"}</td>
                        <td className="px-3 py-2">
                          {sp.verified ? (
                            <span className="rounded-full bg-[#006728] px-2 py-0.5 text-[10px] font-bold text-white">確認済</span>
                          ) : (
                            <span className="text-[10px] text-[#8b8b8b]">未確認</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Link href={`/admin/specs/${sp.id}`} className="text-xs font-bold text-[#006728] hover:underline">
                            編集
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[11px] text-[#8b8b8b]">紐づいたスペックがありません</p>
            )}
          </AdminFormSection>

          {/* Bottom action bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="text-xs font-bold text-red-500 hover:text-red-700"
            >
              削除
            </button>
            <div className="flex-1" />
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-[#006728] px-6 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
