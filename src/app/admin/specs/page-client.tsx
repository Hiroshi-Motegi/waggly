"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { apiFetch } from "@/lib/api-client";

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
  verified: boolean;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

const CATEGORY_ORDER = ["driver", "fairway_wood", "utility", "iron", "wedge", "putter"];

const noImage: Record<string, string> = {
  driver: "/no-images/driver.png",
  fairway_wood: "/no-images/fw.png",
  utility: "/no-images/ut.png",
  iron: "/no-images/Iron.png",
  wedge: "/no-images/wedge.png",
  putter: "/no-images/putter.png",
};

type SpecItem = { key: keyof ClubSpec; label: string; suffix?: string };

function getSpecItems(category: string): SpecItem[] {
  const items: SpecItem[] = [
    { key: "loft", label: "ロフト角", suffix: "°" },
    { key: "lie", label: "ライ角", suffix: "°" },
    { key: "length", label: "長さ", suffix: "inch" },
    { key: "weight", label: "総重量", suffix: "g" },
    { key: "swing_weight", label: "バランス" },
  ];
  if (category === "driver" || category === "fairway_wood") {
    items.push({ key: "head_volume", label: "ヘッド体積", suffix: "cc" });
  }
  items.push({ key: "head_weight", label: "ヘッド重量", suffix: "g" });
  if (category === "driver") {
    items.push({ key: "distance", label: "飛距離目安", suffix: "yd" });
  }
  return items;
}

function SpecCard({ spec, onUpdate }: { spec: ClubSpec; onUpdate: (updated: ClubSpec) => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const items = getSpecItems(spec.category);
  const filled = items.filter((s) => spec[s.key] != null && spec[s.key] !== "");

  async function handleRefresh(action: "refresh_spec" | "refresh_image") {
    setLoading(action);
    try {
      const res = await apiFetch("/api/admin/specs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: spec.id, action }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-lg bg-white p-3 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-start gap-3">
        <img
          src={spec.image_url ?? noImage[spec.category] ?? "/no-images/etc.png"}
          alt={spec.model}
          className="h-16 w-16 rounded-lg object-contain shrink-0 bg-[#f5f5f5]"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#8b8b8b]">{spec.maker}</p>
          <p className="text-base font-bold text-black truncate">{spec.model}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#006728] font-bold">{spec.club_number ?? CATEGORY_LABELS[spec.category]}</span>
            {spec.verified && (
              <span className="text-[10px] bg-[#006728] text-white px-1.5 py-0.5 rounded-full font-bold">verified</span>
            )}
          </div>
        </div>
      </div>

      {/* Spec grid */}
      {filled.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {filled.map((s) => (
            <div key={s.key} className="flex flex-col rounded-lg border border-[#ececec] bg-[#fafafa] p-2">
              <span className="text-[10px] text-[#8b8b8b]">{s.label}</span>
              <span className="text-sm font-bold text-black">
                {String(spec[s.key])}{s.suffix ?? ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleRefresh("refresh_spec")}
          disabled={loading !== null}
          className="flex-1 text-center text-xs text-[#006728] font-bold border border-[#006728] rounded-full py-1.5 disabled:opacity-40"
        >
          {loading === "refresh_spec" ? "取得中..." : "情報を再取得"}
        </button>
        <button
          onClick={() => handleRefresh("refresh_image")}
          disabled={loading !== null}
          className="flex-1 text-center text-xs text-[#006728] font-bold border border-[#006728] rounded-full py-1.5 disabled:opacity-40"
        >
          {loading === "refresh_image" ? "取得中..." : "画像再取得"}
        </button>
      </div>

      {/* Affiliate link */}
      {spec.affiliate_url && (
        <a
          href={spec.affiliate_url}
          target="_blank"
          rel="noopener"
          className="text-center text-xs text-white font-bold bg-[#006728] rounded-full py-1.5"
        >
          楽天で見る
        </a>
      )}
    </div>
  );
}

export function SpecsClient() {
  const [specs, setSpecs] = useState<ClubSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    apiFetch("/api/admin/specs")
      .then((r) => r.ok ? r.json() : [])
      .then(setSpecs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? specs : specs.filter((s) => s.category === filter);

  // Group by maker → model
  const grouped = new Map<string, Map<string, ClubSpec[]>>();
  for (const spec of filtered) {
    if (!grouped.has(spec.maker)) grouped.set(spec.maker, new Map());
    const models = grouped.get(spec.maker)!;
    if (!models.has(spec.model)) models.set(spec.model, []);
    models.get(spec.model)!.push(spec);
  }

  // Sort within each model by category order then club_number
  for (const models of grouped.values()) {
    for (const [model, clubs] of models) {
      clubs.sort((a, b) => {
        const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
        if (catDiff !== 0) return catDiff;
        return (a.club_number ?? "").localeCompare(b.club_number ?? "");
      });
    }
  }

  const categories = [...new Set(specs.map((s) => s.category))].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b),
  );

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <PageHeader title={`クラブスペックDB (${specs.length}件)`} variant="dark" />

      {/* Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter("all")}
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${filter === "all" ? "bg-[#006728] text-white" : "bg-white text-[#006728] border border-[#006728]"}`}
        >
          すべて
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${filter === cat ? "bg-[#006728] text-white" : "bg-white text-[#006728] border border-[#006728]"}`}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-lg bg-white p-6 text-center">
          <p className="text-sm text-[#8b8b8b]">読み込み中...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([maker, models]) => (
            <div key={maker}>
              <h2 className="text-lg font-bold text-white px-1 mb-2">{maker}</h2>
              {[...models.entries()].map(([model, clubs]) => (
                <div key={model} className="mb-3">
                  <p className="text-sm font-bold text-white/70 px-1 mb-1">{model}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {clubs.map((spec) => (
                      <SpecCard key={spec.id} spec={spec} onUpdate={(updated) => {
                        setSpecs((prev) => prev.map((s) => s.id === updated.id ? updated : s));
                      }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
