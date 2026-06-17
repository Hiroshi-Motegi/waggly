"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Lock, Unlock, ExternalLink, Search, Link2 } from "lucide-react";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { useAdminOne, useAdminList } from "@/hooks/admin/use-admin-list";
import { useSpecActions } from "@/hooks/admin/use-spec-actions";

/* ── Types ── */

interface ClubSpec {
  id: string;
  maker: string;
  model: string;
  category: string;
  club_number: string | null;
  loft: number | null;
  lie: number | null;
  length: number | null;
  distance: number | null;
  weight: number | null;
  swing_weight: string | null;
  head_volume: number | null;
  head_weight: number | null;
  image_url: string | null;
  affiliate_url: string | null;
  source: string;
  verified: boolean;
  series_id: string | null;
  series: { id: string; maker: string; model: string; image_url: string | null; affiliate_url: string | null } | null;
}

interface SeriesItem {
  id: string;
  maker: string;
  model: string;
}

/* ── Constants ── */

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

const CATEGORY_OPTIONS = [
  { value: "driver", label: "ドライバー" },
  { value: "fairway_wood", label: "フェアウェイウッド" },
  { value: "utility", label: "ユーティリティ" },
  { value: "iron", label: "アイアン" },
  { value: "wedge", label: "ウェッジ" },
  { value: "putter", label: "パター" },
];

const noImage: Record<string, string> = {
  driver: "/no-images/driver.png",
  fairway_wood: "/no-images/fw.png",
  utility: "/no-images/ut.png",
  iron: "/no-images/Iron.png",
  wedge: "/no-images/wedge.png",
  putter: "/no-images/putter.png",
};

/* ── Helpers ── */

interface FormState {
  maker: string;
  model: string;
  category: string;
  club_number: string;
  loft: string;
  lie: string;
  length: string;
  weight: string;
  swing_weight: string;
  head_volume: string;
  head_weight: string;
  distance: string;
  image_url: string;
  affiliate_url: string;
  series_id: string;
}

function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function specToForm(spec: ClubSpec): FormState {
  return {
    maker: spec.maker ?? "",
    model: spec.model ?? "",
    category: spec.category ?? "driver",
    club_number: spec.club_number ?? "",
    loft: spec.loft != null ? String(spec.loft) : "",
    lie: spec.lie != null ? String(spec.lie) : "",
    length: spec.length != null ? String(spec.length) : "",
    weight: spec.weight != null ? String(spec.weight) : "",
    swing_weight: spec.swing_weight ?? "",
    head_volume: spec.head_volume != null ? String(spec.head_volume) : "",
    head_weight: spec.head_weight != null ? String(spec.head_weight) : "",
    distance: spec.distance != null ? String(spec.distance) : "",
    image_url: spec.image_url ?? "",
    affiliate_url: spec.affiliate_url ?? "",
    series_id: spec.series_id ?? "",
  };
}

/* ── Component ── */

export default function SpecEditPage() {
  const routeParams = useParams<{ id: string }>();
  const id = routeParams.id;

  const { data: spec, mutate, isLoading } = useAdminOne<ClubSpec>("specs", id);
  const { data: seriesData } = useAdminList<SeriesItem>("series", { pageSize: 100 });
  const { updateSpec, refreshSpec, refreshImage, lookupRakuten, toggleVerified } = useSpecActions(id, () => mutate());

  const [form, setForm] = useState<FormState>({
    maker: "", model: "", category: "driver", club_number: "",
    loft: "", lie: "", length: "", weight: "", swing_weight: "",
    head_volume: "", head_weight: "", distance: "",
    image_url: "", affiliate_url: "", series_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [rakutenUrl, setRakutenUrl] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  // Sync form from spec data
  useEffect(() => {
    if (spec) setForm(specToForm(spec));
  }, [spec]);

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateSpec({
        maker: form.maker,
        model: form.model,
        category: form.category,
        club_number: form.club_number || null,
        loft: parseNum(form.loft),
        lie: parseNum(form.lie),
        length: parseNum(form.length),
        weight: parseNum(form.weight),
        swing_weight: form.swing_weight || null,
        head_volume: parseNum(form.head_volume),
        head_weight: parseNum(form.head_weight),
        distance: parseNum(form.distance),
        image_url: form.image_url || null,
        affiliate_url: form.affiliate_url || null,
        series_id: form.series_id || null,
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
    if (!spec) return;
    await toggleVerified(spec.verified);
    await mutate();
  }

  async function handleRefreshSpec() {
    await refreshSpec();
    await mutate();
  }

  async function handleRefreshImage() {
    await refreshImage();
    await mutate();
  }

  /* ── Loading ── */

  if (isLoading || !spec) return <div className="p-6 text-[#8b8b8b]">読み込み中...</div>;

  /* ── Derived values ── */

  const imageSrc = spec.series?.image_url ?? spec.image_url ?? noImage[spec.category] ?? "/no-images/etc.png";
  const categoryLabel = CATEGORY_LABELS[spec.category] ?? spec.category;
  const titleText = `${spec.maker} ${spec.model} ${spec.club_number ?? ""}`.trim();
  const seriesList: SeriesItem[] = seriesData?.data ?? [];
  const hasSeriesSelected = form.series_id !== "";
  const searchKeyword = `${form.maker} ${form.model} ${form.club_number} スペック`;
  const affiliateUrl = spec.series?.affiliate_url ?? spec.affiliate_url;

  return (
    <div className="space-y-4 p-4">
      {/* Breadcrumb */}
      <AdminBreadcrumb
        items={[
          { label: "クラブスペック", href: "/admin/specs" },
          { label: categoryLabel },
          { label: titleText },
        ]}
      />

      {/* Title */}
      <h1 className="text-lg font-bold text-[#333]">{titleText}</h1>

      {/* 2-column layout */}
      <div className="flex gap-4">
        {/* ── Left column ── */}
        <div className="w-40 shrink-0 space-y-3">
          {/* Product image */}
          <div className="rounded-lg bg-[#f5f5f5] p-2">
            <img
              src={imageSrc}
              alt={titleText}
              className="w-full aspect-square object-contain"
            />
          </div>

          {/* Lock/Unlock button */}
          <button
            onClick={handleToggleVerified}
            className={`flex w-full items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
              spec.verified
                ? "bg-[#006728] text-white"
                : "border border-[#dfdfdf] bg-white text-[#8b8b8b]"
            }`}
          >
            {spec.verified ? <Lock size={12} /> : <Unlock size={12} />}
            {spec.verified ? "Locked" : "Unlocked"}
          </button>

          {/* Source badge */}
          <div className="text-center">
            <span className="inline-block rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] text-[#8b8b8b]">
              {spec.source}
            </span>
          </div>

          {/* Series badge */}
          {spec.series && (
            <div className="text-center">
              <span className="inline-block rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                {spec.series.maker} {spec.series.model}
              </span>
            </div>
          )}
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
                  onChange={(e) => updateField("maker", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">モデル</label>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => updateField("model", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">カテゴリ</label>
                <select
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">番手</label>
                <input
                  type="text"
                  value={form.club_number}
                  onChange={(e) => updateField("club_number", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
            </div>

            {/* Series selector */}
            <div className="flex flex-col gap-0.5 pt-2">
              <label className="text-[10px] text-[#8b8b8b]">シリーズ</label>
              <select
                value={form.series_id}
                onChange={(e) => updateField("series_id", e.target.value)}
                className={`rounded border bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728] ${
                  hasSeriesSelected ? "border-amber-400" : "border-[#dfdfdf]"
                }`}
              >
                <option value="">なし（単体）</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.maker} {s.model}
                  </option>
                ))}
              </select>
            </div>
          </AdminFormSection>

          {/* スペック */}
          <AdminFormSection title="スペック">
            <div className="grid grid-cols-4 gap-3">
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">ロフト角 (&deg;)</label>
                <input
                  type="number"
                  value={form.loft}
                  onChange={(e) => updateField("loft", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">ライ角 (&deg;)</label>
                <input
                  type="number"
                  value={form.lie}
                  onChange={(e) => updateField("lie", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">長さ (inch)</label>
                <input
                  type="number"
                  value={form.length}
                  onChange={(e) => updateField("length", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">総重量 (g)</label>
                <input
                  type="number"
                  value={form.weight}
                  onChange={(e) => updateField("weight", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">バランス</label>
                <input
                  type="text"
                  value={form.swing_weight}
                  onChange={(e) => updateField("swing_weight", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">ヘッド体積 (cc)</label>
                <input
                  type="number"
                  value={form.head_volume}
                  onChange={(e) => updateField("head_volume", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">ヘッド重量 (g)</label>
                <input
                  type="number"
                  value={form.head_weight}
                  onChange={(e) => updateField("head_weight", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">飛距離目安 (yd)</label>
                <input
                  type="number"
                  value={form.distance}
                  onChange={(e) => updateField("distance", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
            </div>
          </AdminFormSection>

          {/* 画像・リンク — only when no series selected */}
          {!hasSeriesSelected && (
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
                  onChange={(e) => updateField("image_url", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">アフィリエイトURL</label>
                <input
                  type="url"
                  value={form.affiliate_url}
                  onChange={(e) => updateField("affiliate_url", e.target.value)}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                  placeholder="-"
                />
              </div>
            </AdminFormSection>
          )}

          {/* Bottom action bar */}
          <div className="flex items-center gap-2">
            {/* Left actions */}
            <button
              onClick={handleRefreshSpec}
              className="rounded border border-[#dfdfdf] bg-white px-3 py-1.5 text-xs font-bold text-[#333] hover:bg-[#f5f5f5]"
            >
              AI再取得
            </button>

            {!hasSeriesSelected && (
              <button
                onClick={handleRefreshImage}
                className="rounded border border-[#dfdfdf] bg-white px-3 py-1.5 text-xs font-bold text-[#333] hover:bg-[#f5f5f5]"
              >
                画像再取得
              </button>
            )}

            {affiliateUrl && (
              <a
                href={affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[#bf0000] hover:underline"
              >
                <Link2 size={12} />
                楽天で見る
                <ExternalLink size={10} />
              </a>
            )}

            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Search size={12} />
              Google
              <ExternalLink size={10} />
            </a>

            <a
              href={`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(`${form.maker} ${form.model}`.trim())}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#bf0000] hover:underline"
            >
              <Search size={12} />
              楽天
              <ExternalLink size={10} />
            </a>

            {/* Right — save button */}
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
