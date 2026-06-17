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

interface Configuration {
  id: string;
  shaft_variant_id: string | null;
  length: number | null;
  total_weight: number | null;
  swing_weight: string | null;
}

interface ShaftModelWithVariants {
  id: string;
  maker: string;
  name: string;
  type: string | null;
  variants: {
    id: string;
    flex: string | null;
    weight: number | null;
    torque: number | null;
    kick_point: string | null;
  }[];
}

interface SeriesShaft {
  link_id: string;
  is_default: boolean;
  shaft_model: ShaftModelWithVariants;
}

interface Series {
  id: string;
  maker: string;
  model: string;
  category: string | null;
  image_url: string | null;
  affiliate_url: string | null;
  verified: boolean;
  source: string;
  spec_count: number;
  specs: {
    id: string;
    category: string;
    club_number: string | null;
    sort_order: number | null;
    loft: number | null;
    lie: number | null;
    bounce: number | null;
    head_volume: number | null;
    head_weight: number | null;
    distance: number | null;
    verified: boolean;
    configurations: Configuration[];
  }[];
  shafts: SeriesShaft[];
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

/* ── Inline Heads Editor ── */

type SpecRow = Series["specs"][number];
type HeadEdits = Record<string, Record<string, string>>;

function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function HeadsInlineEditor({
  specs,
  seriesId,
  maker,
  model,
  category,
  onUpdated,
}: {
  specs: SpecRow[];
  seriesId: string;
  maker: string;
  model: string;
  category: string;
  onUpdated: () => void;
}) {
  const [edits, setEdits] = useState<HeadEdits>({});
  const [savingHeads, setSavingHeads] = useState(false);

  function setField(id: string, field: string, value: string) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function getVal(sp: SpecRow, field: keyof SpecRow): string {
    const edited = edits[sp.id]?.[field];
    if (edited !== undefined) return edited;
    const v = sp[field];
    return v != null ? String(v) : "";
  }

  const changedIds = Object.keys(edits).filter((id) => Object.keys(edits[id]).length > 0);

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= specs.length) return;
    // Swap sort_order values between the two rows
    const a = specs[index];
    const b = specs[target];
    const orderA = a.sort_order ?? (index + 1) * 10;
    const orderB = b.sort_order ?? (target + 1) * 10;
    setField(a.id, "sort_order", String(orderB));
    setField(b.id, "sort_order", String(orderA));
  }

  async function handleDeleteHead(headId: string, clubNumber: string | null) {
    if (!confirm(`ヘッド「${clubNumber ?? "?"}」を削除しますか？`)) return;
    await apiFetch("/api/admin/specs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: headId }),
    });
    onUpdated();
  }

  async function handleSaveHeads() {
    if (changedIds.length === 0) return;
    setSavingHeads(true);
    try {
      await Promise.all(
        changedIds.map((id) => {
          const changes = edits[id];
          const payload: Record<string, any> = {};
          if ("sort_order" in changes) payload.sort_order = parseNum(changes.sort_order);
          if ("loft" in changes) payload.loft = parseNum(changes.loft);
          if ("lie" in changes) payload.lie = parseNum(changes.lie);
          if ("head_volume" in changes) payload.head_volume = parseNum(changes.head_volume);
          if ("head_weight" in changes) payload.head_weight = parseNum(changes.head_weight);
          if ("distance" in changes) payload.distance = parseNum(changes.distance);
          return apiFetch("/api/admin/specs", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, action: "update", data: payload }),
          });
        }),
      );
      setEdits({});
      onUpdated();
    } finally {
      setSavingHeads(false);
    }
  }

  // Head-only fields (length/total_weight/swing_weight are in configurations)
  const FIELDS = [
    { key: "loft", label: "ロフト", suffix: "°", type: "number" as const },
    { key: "lie", label: "ライ角", suffix: "°", type: "number" as const },
    { key: "bounce", label: "バウンス", suffix: "°", type: "number" as const },
    { key: "head_volume", label: "体積", suffix: "cc", type: "number" as const },
    { key: "distance", label: "飛距離", suffix: "yd", type: "number" as const },
  ];

  return (
    <AdminFormSection title={`ヘッド一覧 (${specs.length}件)`}>
      {specs.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
                  <th className="w-8 px-1 py-2 text-center text-[11px] text-[#888] font-medium">順</th>
                  <th className="px-2 py-2 text-left text-[11px] text-[#888] font-medium whitespace-nowrap">番手</th>
                  {FIELDS.map((f) => (
                    <th key={f.key} className="px-1 py-2 text-left text-[11px] text-[#888] font-medium whitespace-nowrap">{f.label}</th>
                  ))}
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {specs.map((sp, idx) => (
                  <tr key={sp.id} className={`border-b border-[#f0f0f0] ${edits[sp.id]?.sort_order !== undefined ? "bg-amber-50" : ""}`}>
                    <td className="px-1 py-1 text-center">
                      <div className="flex flex-col items-center gap-0">
                        <button
                          onClick={() => handleMove(idx, -1)}
                          disabled={idx === 0}
                          className="text-[10px] text-[#888] hover:text-[#006728] disabled:opacity-20 leading-none"
                        >▲</button>
                        <button
                          onClick={() => handleMove(idx, 1)}
                          disabled={idx === specs.length - 1}
                          className="text-[10px] text-[#888] hover:text-[#006728] disabled:opacity-20 leading-none"
                        >▼</button>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                      {sp.club_number ?? (CATEGORY_LABELS[sp.category] ?? sp.category)}
                    </td>
                    {FIELDS.map((f) => (
                      <td key={f.key} className="px-1 py-1">
                        <div className="flex items-center gap-0.5">
                          <input
                            type={f.type}
                            step="any"
                            value={getVal(sp, f.key as keyof SpecRow)}
                            onChange={(e) => setField(sp.id, f.key, e.target.value)}
                            className="w-16 rounded border border-[#e5e5e5] bg-white px-1.5 py-0.5 text-sm outline-none focus:border-[#006728]"
                            placeholder="-"
                          />
                          {f.suffix && <span className="text-[10px] text-[#888]">{f.suffix}</span>}
                        </div>
                      </td>
                    ))}
                    <td className="px-1 py-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteHead(sp.id, sp.club_number)}
                        className="text-[10px] text-red-400 hover:text-red-600"
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {changedIds.length > 0 && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveHeads}
                disabled={savingHeads}
                className="rounded-full bg-[#006728] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
              >
                {savingHeads ? "保存中..." : `${changedIds.length}件のヘッドを保存`}
              </button>
            </div>
          )}
        </>
      )}

      {/* 番手追加フォーム */}
      <AddHeadForm
        seriesId={seriesId}
        maker={maker}
        model={model}
        category={category}
        onCreated={onUpdated}
      />
    </AdminFormSection>
  );
}

/* ── Add Head Form ── */

function AddHeadForm({
  seriesId,
  maker,
  model,
  category,
  onCreated,
}: {
  seriesId: string;
  maker: string;
  model: string;
  category: string;
  onCreated: () => void;
}) {
  const [clubNumber, setClubNumber] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!clubNumber.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await apiFetch("/api/admin/specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maker,
          model,
          category,
          club_number: clubNumber.trim(),
          model_id: seriesId,
        }),
      });
      if (res.ok) {
        setClubNumber("");
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error ?? "作成に失敗しました");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex items-end gap-2 pt-2">
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] text-[#8b8b8b]">番手を追加</label>
        <input
          type="text"
          value={clubNumber}
          onChange={(e) => setClubNumber(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          className="w-24 rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#006728]"
          placeholder="7i, 52°..."
        />
      </div>
      <button
        onClick={handleAdd}
        disabled={creating || !clubNumber.trim()}
        className="rounded-full bg-[#006728] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        {creating ? "追加中..." : "＋ 追加"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

/* ── Shaft Linker ── */

interface ShaftModelSearchResult {
  id: string;
  maker: string;
  name: string;
  type: string | null;
  variants: { id: string; flex: string | null; weight: number | null }[];
}

function ShaftLinker({
  seriesId,
  shafts,
  onUpdated,
}: {
  seriesId: string;
  shafts: SeriesShaft[];
  onUpdated: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShaftModelSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await apiFetch(`/api/admin/shafts?search=${encodeURIComponent(q)}&pageSize=10`);
      if (res.ok) {
        const json = await res.json();
        setResults(json.data ?? json);
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(shaftModelId: string) {
    await apiFetch(`/api/admin/series/${seriesId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_shaft", shaft_model_id: shaftModelId }),
    });
    setResults((prev) => prev.filter((r) => r.id !== shaftModelId));
    onUpdated();
  }

  async function handleRemove(linkId: string, shaftModelId: string) {
    setRemoving(linkId);
    try {
      await apiFetch(`/api/admin/series/${seriesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_shaft", link_id: linkId, shaft_model_id: shaftModelId }),
      });
      onUpdated();
    } finally {
      setRemoving(null);
    }
  }

  // Filter out already-linked shaft model IDs from search results
  const linkedModelIds = new Set(shafts.map((s) => s.shaft_model.id));
  const filteredResults = results.filter((r) => !linkedModelIds.has(r.id));

  return (
    <AdminFormSection title={`シャフト (${shafts.length}モデル)`}>
      {/* Linked shafts */}
      {shafts.length > 0 && (
        <div className="space-y-1">
          {shafts.map((s) => (
            <div key={s.link_id} className="flex items-center gap-2 rounded border border-[#e5e5e5] bg-white px-3 py-1.5 text-sm">
              <div className="flex-1">
                <span className="font-medium">{s.shaft_model.maker} {s.shaft_model.name}</span>
                <span className="ml-2 text-[#888]">
                  {s.shaft_model.variants.length}バリアント
                  {s.shaft_model.variants.length > 0 && (
                    <> ({s.shaft_model.variants.map((v) => v.flex ?? "?").join(", ")})</>
                  )}
                </span>
                {s.is_default && (
                  <span className="ml-2 rounded-full bg-[#006728] px-1.5 py-0.5 text-[9px] font-bold text-white">
                    デフォルト
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRemove(s.link_id, s.shaft_model.id)}
                disabled={removing === s.link_id}
                className="text-[10px] text-red-400 hover:text-red-600 disabled:opacity-40"
                title="シャフトモデルを削除"
              >
                ✕ 削除
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="flex items-end gap-2 pt-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <label className="text-[10px] text-[#8b8b8b]">シャフトモデルを検索して追加</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#006728]"
            placeholder="シャフト名で検索..."
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="shrink-0 rounded-full bg-[#006728] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          {searching ? "検索中..." : "検索"}
        </button>
      </div>

      {/* Search results */}
      {filteredResults.length > 0 && (
        <div className="mt-2 space-y-1">
          {filteredResults.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded border border-dashed border-[#ccc] bg-[#fafafa] px-3 py-1 text-sm">
              <div className="flex-1">
                {r.maker} {r.name}
                <span className="ml-2 text-[#888]">
                  {r.variants.length}バリアント
                </span>
              </div>
              <button
                onClick={() => handleAdd(r.id)}
                className="rounded bg-[#006728] px-2 py-0.5 text-[11px] font-bold text-white"
              >
                追加
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminFormSection>
  );
}

/* ── Configurations Matrix ── */

// Flatten shaft models into a list of columns: { modelName, variant }
interface ShaftColumn {
  modelName: string;
  variantId: string;
  flex: string | null;
  weight: number | null;
}

type ConfigEdits = Record<string, Record<string, { length?: string; total_weight?: string; swing_weight?: string }>>;

function ConfigurationsMatrix({
  specs,
  shafts,
  seriesId,
  onUpdated,
}: {
  specs: Series["specs"];
  shafts: SeriesShaft[];
  seriesId: string;
  onUpdated: () => void;
}) {
  const [edits, setEdits] = useState<ConfigEdits>({});
  const [saving, setSaving] = useState(false);

  // Flatten shaft models' variants into columns
  const shaftColumns: ShaftColumn[] = shafts.flatMap((s) =>
    s.shaft_model.variants.map((v) => ({
      modelName: s.shaft_model.name,
      variantId: v.id,
      flex: v.flex,
      weight: v.weight,
    })),
  );

  // Group columns by model name for header spanning
  const modelGroups: { modelName: string; columns: ShaftColumn[] }[] = [];
  for (const col of shaftColumns) {
    const last = modelGroups[modelGroups.length - 1];
    if (last && last.modelName === col.modelName) {
      last.columns.push(col);
    } else {
      modelGroups.push({ modelName: col.modelName, columns: [col] });
    }
  }

  function getConfigVal(
    spec: Series["specs"][number],
    variantId: string,
    field: "length" | "total_weight" | "swing_weight",
  ): string {
    const edited = edits[spec.id]?.[variantId]?.[field];
    if (edited !== undefined) return edited;
    const cfg = spec.configurations.find((c) => c.shaft_variant_id === variantId);
    if (!cfg) return "";
    const v = cfg[field];
    return v != null ? String(v) : "";
  }

  function setConfigField(specId: string, variantId: string, field: string, value: string) {
    setEdits((prev) => ({
      ...prev,
      [specId]: {
        ...prev[specId],
        [variantId]: { ...prev[specId]?.[variantId], [field]: value },
      },
    }));
  }

  // Collect all changed cells
  const changedCells: { head_id: string; shaft_variant_id: string }[] = [];
  for (const [specId, variantMap] of Object.entries(edits)) {
    for (const [variantId, fields] of Object.entries(variantMap)) {
      if (Object.keys(fields).length > 0) {
        changedCells.push({ head_id: specId, shaft_variant_id: variantId });
      }
    }
  }

  async function handleSave() {
    if (changedCells.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        changedCells.map(({ head_id, shaft_variant_id }) => {
          const spec = specs.find((s) => s.id === head_id);
          const fields = edits[head_id]?.[shaft_variant_id] ?? {};
          // Merge existing values with edits
          const existing = spec?.configurations.find((c) => c.shaft_variant_id === shaft_variant_id);
          const length = "length" in fields ? parseNum(fields.length!) : (existing?.length ?? null);
          const total_weight = "total_weight" in fields ? parseNum(fields.total_weight!) : (existing?.total_weight ?? null);
          const swing_weight = "swing_weight" in fields
            ? (fields.swing_weight!.trim() || null)
            : (existing?.swing_weight ?? null);

          return apiFetch(`/api/admin/series/${seriesId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "upsert_config",
              head_id,
              shaft_variant_id,
              length,
              total_weight,
              swing_weight,
            }),
          });
        }),
      );
      setEdits({});
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  const sortedSpecs = [...specs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <AdminFormSection title="スペック表 (configurations)">
      <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
        <table className="w-full text-sm">
          <thead>
            {/* Model group header row */}
            <tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
              <th className="sticky left-0 z-10 bg-[#fafafa] px-2 py-1 text-left text-[11px] text-[#888] font-medium" rowSpan={2}>
                番手
              </th>
              {modelGroups.map((g, i) => (
                <th
                  key={`${g.modelName}-${i}`}
                  colSpan={g.columns.length * 3}
                  className="border-l border-[#e5e5e5] px-2 py-1 text-center text-[11px] text-[#888] font-medium"
                >
                  {g.modelName}
                </th>
              ))}
            </tr>
            {/* Variant (flex) sub-header row */}
            <tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
              {shaftColumns.map((col) => (
                <th
                  key={col.variantId}
                  colSpan={3}
                  className="border-l border-[#e5e5e5] px-1 py-1 text-center text-[10px] text-[#888] font-normal"
                >
                  {col.flex ?? "?"}
                  {col.weight != null && <span className="ml-0.5 text-[#aaa]">({col.weight}g)</span>}
                  <div className="flex justify-center gap-1 text-[9px] text-[#bbb]">
                    <span>長さ</span><span>重量</span><span>SW</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedSpecs.map((sp) => (
              <tr key={sp.id} className="border-b border-[#f0f0f0]">
                <td className="sticky left-0 z-10 bg-white px-2 py-1 font-medium whitespace-nowrap">
                  {sp.club_number ?? (CATEGORY_LABELS[sp.category] ?? sp.category)}
                </td>
                {shaftColumns.map((col) => (
                  <td key={`${sp.id}-${col.variantId}`} className="border-l border-[#f0f0f0] px-0.5 py-0.5">
                    <div className="flex gap-0.5">
                      <input
                        type="number"
                        step="any"
                        value={getConfigVal(sp, col.variantId, "length")}
                        onChange={(e) => setConfigField(sp.id, col.variantId, "length", e.target.value)}
                        className="w-12 rounded border border-[#e5e5e5] bg-white px-1 py-0.5 text-xs outline-none focus:border-[#006728]"
                        placeholder='"'
                        title="長さ (inch)"
                      />
                      <input
                        type="number"
                        step="any"
                        value={getConfigVal(sp, col.variantId, "total_weight")}
                        onChange={(e) => setConfigField(sp.id, col.variantId, "total_weight", e.target.value)}
                        className="w-12 rounded border border-[#e5e5e5] bg-white px-1 py-0.5 text-xs outline-none focus:border-[#006728]"
                        placeholder="g"
                        title="総重量 (g)"
                      />
                      <input
                        type="text"
                        value={getConfigVal(sp, col.variantId, "swing_weight")}
                        onChange={(e) => setConfigField(sp.id, col.variantId, "swing_weight", e.target.value)}
                        className="w-10 rounded border border-[#e5e5e5] bg-white px-1 py-0.5 text-xs outline-none focus:border-[#006728]"
                        placeholder="SW"
                        title="スイングウェイト"
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {changedCells.length > 0 && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#006728] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {saving ? "保存中..." : `${changedCells.length}件の変更を保存`}
          </button>
        </div>
      )}
    </AdminFormSection>
  );
}

/* ── Component ── */

export default function SeriesEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: series, mutate, isLoading } = useAdminOne<Series>("series", id);
  const { updateSeries, lookupRakuten, toggleVerified } = useSeriesActions(id, () => mutate());

  const [form, setForm] = useState({ maker: "", model: "", category: "", image_url: "", affiliate_url: "" });
  const [saving, setSaving] = useState(false);
  const [rakutenUrl, setRakutenUrl] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const CATEGORY_OPTIONS = [
    { value: "driver", label: "ドライバー" },
    { value: "fairway_wood", label: "フェアウェイウッド" },
    { value: "utility", label: "ユーティリティ" },
    { value: "iron", label: "アイアン" },
    { value: "wedge", label: "ウェッジ" },
    { value: "putter", label: "パター" },
  ];

  // Sync form from data
  useEffect(() => {
    if (series) {
      setForm({
        maker: series.maker ?? "",
        model: series.model ?? "",
        category: series.category ?? "",
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
        category: form.category || null,
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
            <div className="grid grid-cols-3 gap-3">
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
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[#8b8b8b]">カテゴリ</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
                >
                  <option value="">未設定</option>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
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

          {/* ヘッド（番手）一覧 — インライン編集 */}
          <HeadsInlineEditor
            specs={series.specs}
            seriesId={series.id}
            maker={series.maker}
            model={series.model}
            category={series.category ?? "iron"}
            onUpdated={() => mutate()}
          />

          {/* シャフト */}
          <ShaftLinker seriesId={series.id} shafts={series.shafts} onUpdated={() => mutate()} />

          {/* スペック表 (configurations) */}
          {series.shafts.length > 0 ? (
            <ConfigurationsMatrix
              specs={series.specs}
              shafts={series.shafts}
              seriesId={series.id}
              onUpdated={() => mutate()}
            />
          ) : (
            <AdminFormSection title="スペック表">
              <p className="text-sm text-[#8b8b8b]">シャフトを追加するとスペック表が表示されます</p>
            </AdminFormSection>
          )}

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
