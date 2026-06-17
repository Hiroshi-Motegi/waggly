"use client";

import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Lock, Unlock, ExternalLink, Search } from "lucide-react";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { useAdminOne, useAdminList } from "@/hooks/admin/use-admin-list";
import { useSpecActions } from "@/hooks/admin/use-spec-actions";
import { apiFetch } from "@/lib/api-client";

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
  total_weight: number | null;
  swing_weight: string | null;
  head_volume: number | null;
  head_weight: number | null;
  image_url: string | null;
  own_image_url: string | null;
  affiliate_url: string | null;
  source: string;
  verified: boolean;
  series_id: string | null;
  series: { id: string; maker: string; model: string; image_url: string | null; own_image_url: string | null; affiliate_url: string | null } | null;
}

interface SeriesItem {
  id: string;
  maker: string;
  model: string;
}

/* ── Series Combobox ── */

function SeriesCombobox({
  seriesList,
  value,
  onChange,
  hasSelection,
}: {
  seriesList: SeriesItem[];
  value: string;
  onChange: (v: string) => void;
  hasSelection: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = seriesList.find((s) => s.id === value);
  const filtered = search
    ? seriesList.filter((s) =>
        `${s.maker} ${s.model}`.toLowerCase().includes(search.toLowerCase())
      )
    : seriesList;

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div className="flex flex-col gap-0.5 pt-2" ref={ref}>
      <label className="text-[10px] text-[#8b8b8b]">シリーズ</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => { setOpen(!open); setSearch(""); }}
          className={`w-full text-left rounded border bg-white px-2 py-1.5 text-sm text-black outline-none ${
            hasSelection ? "border-amber-400" : "border-[#dfdfdf]"
          }`}
        >
          {selected ? `${selected.maker} ${selected.model}` : "なし（単体）"}
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-[#dfdfdf] bg-white shadow-lg">
            <div className="p-1.5">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="検索..."
                autoFocus
                className="w-full rounded border border-[#dfdfdf] px-2 py-1 text-sm outline-none focus:border-[#006728]"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#f5f5f5] ${!value ? "font-bold text-[#006728]" : ""}`}
              >
                なし（単体）
              </button>
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onChange(s.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#f5f5f5] ${value === s.id ? "font-bold text-[#006728]" : ""}`}
                >
                  {s.maker} {s.model}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-xs text-[#8b8b8b]">該当なし</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
  total_weight: string;
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
    total_weight: spec.total_weight != null ? String(spec.total_weight) : "",
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

export default function SpecEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: spec, mutate, isLoading } = useAdminOne<ClubSpec>("specs", id);
  const { data: seriesData } = useAdminList<SeriesItem>("series", { pageSize: 100 });
  const { updateSpec, refreshSpec, refreshImage, lookupRakuten, toggleVerified } = useSpecActions(id, () => mutate());

  const [form, setForm] = useState<FormState>({
    maker: "", model: "", category: "driver", club_number: "",
    loft: "", lie: "", length: "", total_weight: "", swing_weight: "",
    head_volume: "", head_weight: "", distance: "",
    image_url: "", affiliate_url: "", series_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [rakutenUrl, setRakutenUrl] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const payload: Record<string, any> = {
        maker: form.maker,
        model: form.model,
        category: form.category,
        club_number: form.club_number || null,
        loft: parseNum(form.loft),
        lie: parseNum(form.lie),
        length: parseNum(form.length),
        total_weight: parseNum(form.total_weight),
        swing_weight: form.swing_weight || null,
        head_volume: parseNum(form.head_volume),
        head_weight: parseNum(form.head_weight),
        distance: parseNum(form.distance),
        series_id: form.series_id || null,
      };
      if (!form.series_id) {
        payload.image_url = form.image_url || null;
        payload.affiliate_url = form.affiliate_url || null;
      }
      await updateSpec(payload);
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch(`/api/admin/specs/${id}/image`, { method: "POST", body: fd });
      if (res.ok) await mutate();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleImageDelete() {
    if (!confirm("自前画像を削除しますか？")) return;
    await apiFetch(`/api/admin/specs/${id}/image`, { method: "DELETE" });
    await mutate();
  }

  /* ── Loading ── */

  if (isLoading || !spec) return <div className="p-6 text-[#8b8b8b]">読み込み中...</div>;

  /* ── Derived values ── */

  const imageSrc = spec.own_image_url ?? spec.series?.own_image_url ?? spec.series?.image_url ?? spec.image_url ?? noImage[spec.category] ?? "/no-images/etc.png";
  const hasOwnImage = !!spec.own_image_url;
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
      <div className="flex gap-6">
        {/* ── Left column ── */}
        <div className="w-80 shrink-0 space-y-3">
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

          {/* Product image */}
          <div className="rounded-lg bg-[#f5f5f5] p-3">
            <img
              src={imageSrc}
              alt={titleText}
              className="w-full aspect-square object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = noImage[spec.category] ?? "/no-images/etc.png"; }}
            />
          </div>
          {/* Image upload */}
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="flex-1 rounded border border-[#dfdfdf] bg-white px-2 py-1 text-[11px] font-bold text-[#333] hover:bg-[#f5f5f5] disabled:opacity-40">
              {uploading ? "アップロード中..." : "画像をアップロード"}
            </button>
            {hasOwnImage && (
              <button onClick={handleImageDelete}
                className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-bold text-red-500 hover:bg-red-50">
                削除
              </button>
            )}
          </div>

          {/* Links: 楽天で見る / Google / 楽天検索 */}
          <div className="flex flex-wrap items-center gap-3">
            {affiliateUrl && (
              <a href={affiliateUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-bold text-white bg-[#bf0000] rounded-full px-3 py-1">
                楽天で見る <ExternalLink size={10} />
              </a>
            )}
            <a href={`https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Search size={12} />Google <ExternalLink size={10} />
            </a>
            <a href={`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(`${form.maker} ${form.model} ${form.club_number}`.trim())}/`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#bf0000] hover:underline">
              <Search size={12} />楽天 <ExternalLink size={10} />
            </a>
          </div>

          {/* Source badge */}
          <div className="flex items-center gap-2">
            <span className="inline-block rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] text-[#8b8b8b]">
              source: {spec.source}
            </span>
            {spec.series && (
              <span className="inline-block rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                {spec.series.maker} {spec.series.model}
              </span>
            )}
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

            {/* Series selector with search */}
            <SeriesCombobox
              seriesList={seriesList}
              value={form.series_id}
              onChange={(v) => updateField("series_id", v)}
              hasSelection={hasSeriesSelected}
            />

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
                  value={form.total_weight}
                  onChange={(e) => updateField("total_weight", e.target.value)}
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

          {/* 画像・リンク */}
          {hasSeriesSelected ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                画像・リンクはシリーズ「{spec.series?.maker} {spec.series?.model}」で管理されています。
              </p>
              <Link href={`/admin/series/${form.series_id}`}
                className="mt-1 inline-block text-xs font-bold text-amber-700 hover:underline">
                シリーズ編集ページへ →
              </Link>
            </div>
          ) : (
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
