"use client";

import { useState } from "react";
import { Suspense } from "react";
import { useAdminList } from "@/hooks/admin/use-admin-list";
import { apiFetch } from "@/lib/api-client";

/* ── Types ── */

interface GripVariant {
  id: string;
  size: string | null;
  weight: number | null;
  verified: boolean;
}

interface GripModel {
  id: string;
  maker: string;
  name: string;
  material: string | null;
  verified: boolean;
  variants: GripVariant[];
}

/* ── Constants ── */

const inputCls =
  "rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]";

function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/* ── Variant Row (inline editable) ── */

function VariantRow({
  variant,
  onSaved,
  onDelete,
}: {
  variant: GripVariant;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    size: variant.size ?? "",
    weight: variant.weight != null ? String(variant.weight) : "",
    verified: variant.verified,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/grips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_variant",
          variant_id: variant.id,
          data: {
            size: form.size || null,
            weight: parseNum(form.weight),
            verified: form.verified,
          },
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`バリアント「${variant.size ?? "?"}」を削除しますか？`)) return;
    await apiFetch("/api/admin/grips", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_variant", variant_id: variant.id }),
    });
    onDelete();
  }

  return (
    <tr className="border-b border-[#f0f0f0]">
      <td className="px-2 py-1">
        <input
          type="text"
          value={form.size}
          onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))}
          className={`w-24 ${inputCls}`}
          placeholder="M60"
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="number"
          step="any"
          value={form.weight}
          onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
          className={`w-20 ${inputCls}`}
          placeholder="-"
        />
      </td>
      <td className="px-2 py-1">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={form.verified}
            onChange={() => setForm((p) => ({ ...p, verified: !p.verified }))}
            className="rounded accent-[#006728]"
          />
          <span className="text-[10px]">{form.verified ? "済" : "未"}</span>
        </label>
      </td>
      <td className="px-2 py-1">
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-[#006728] px-2 py-0.5 text-[11px] font-bold text-white disabled:opacity-40"
          >
            {saving ? "..." : "保存"}
          </button>
          <button
            onClick={handleDelete}
            className="text-[10px] text-red-400 hover:text-red-600"
          >
            削除
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Add Variant Form ── */

function AddVariantForm({
  modelId,
  onAdded,
}: {
  modelId: string;
  onAdded: () => void;
}) {
  const [size, setSize] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!size.trim()) return;
    setAdding(true);
    try {
      await apiFetch("/api/admin/grips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_variant",
          model_id: modelId,
          size: size.trim(),
        }),
      });
      setSize("");
      onAdded();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex items-end gap-2 pt-2">
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] text-[#8b8b8b]">バリアント追加</label>
        <input
          type="text"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          className={`w-24 ${inputCls}`}
          placeholder="M60, M62..."
        />
      </div>
      <button
        onClick={handleAdd}
        disabled={adding || !size.trim()}
        className="rounded-full bg-[#006728] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        {adding ? "追加中..." : "＋ 追加"}
      </button>
    </div>
  );
}

/* ── Expanded Model Row ── */

function ModelExpanded({
  model,
  onSaved,
  onClose,
}: {
  model: GripModel;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    maker: model.maker,
    name: model.name,
    material: model.material ?? "",
    verified: model.verified,
  });
  const [saving, setSaving] = useState(false);

  async function handleSaveModel() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/grips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: model.id,
          action: "update",
          data: {
            maker: form.maker,
            name: form.name,
            material: form.material || null,
            verified: form.verified,
          },
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModel() {
    if (!confirm(`「${model.maker} ${model.name}」を削除しますか？`)) return;
    await apiFetch("/api/admin/grips", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: model.id }),
    });
    onSaved();
  }

  return (
    <tr className="bg-[#fafdf7] border-b border-[#e5e5e5]">
      <td colSpan={4} className="px-4 py-3">
        {/* Model fields */}
        <div className="grid grid-cols-4 gap-3">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">メーカー</label>
            <input
              type="text"
              value={form.maker}
              onChange={(e) => setForm((p) => ({ ...p, maker: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">グリップ名</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">素材</label>
            <select
              value={form.material}
              onChange={(e) => setForm((p) => ({ ...p, material: e.target.value }))}
              className={inputCls}
            >
              <option value="">未設定</option>
              <option value="ラバー">ラバー</option>
              <option value="コード">コード</option>
              <option value="エラストマー">エラストマー</option>
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">確認済</label>
            <label className="flex items-center gap-1.5 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.verified}
                onChange={() => setForm((p) => ({ ...p, verified: !p.verified }))}
                className="rounded accent-[#006728]"
              />
              <span className="text-sm">{form.verified ? "確認済" : "未確認"}</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button onClick={handleDeleteModel} className="text-xs font-bold text-red-500 hover:text-red-700">
            モデル削除
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="rounded border border-[#dfdfdf] px-3 py-1 text-xs font-bold text-[#333] hover:bg-[#f5f5f5]"
          >
            閉じる
          </button>
          <button
            onClick={handleSaveModel}
            disabled={saving}
            className="rounded-full bg-[#006728] px-4 py-1 text-xs font-bold text-white disabled:opacity-40"
          >
            {saving ? "保存中..." : "モデル保存"}
          </button>
        </div>

        {/* Variants table */}
        <div className="mt-4">
          <p className="text-xs font-bold text-[#006728] mb-2">
            バリアント ({model.variants.length}件)
          </p>
          {model.variants.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
                    <th className="px-2 py-1.5 text-left text-[11px] text-[#888] font-medium">サイズ</th>
                    <th className="px-2 py-1.5 text-left text-[11px] text-[#888] font-medium">重量 (g)</th>
                    <th className="px-2 py-1.5 text-left text-[11px] text-[#888] font-medium">状態</th>
                    <th className="px-2 py-1.5 text-left text-[11px] text-[#888] font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {model.variants.map((v) => (
                    <VariantRow
                      key={v.id}
                      variant={v}
                      onSaved={onSaved}
                      onDelete={onSaved}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AddVariantForm modelId={model.id} onAdded={onSaved} />
        </div>
      </td>
    </tr>
  );
}

/* ── Inner list component ── */

function GripsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newMaker, setNewMaker] = useState("");
  const [newName, setNewName] = useState("");
  const [newMaterial, setNewMaterial] = useState("");
  const [creating, setCreating] = useState(false);

  const { data, isLoading, mutate } = useAdminList<GripModel>("grips", {
    page,
    pageSize: 20,
    ...(search ? { search } : {}),
  });

  async function handleCreate() {
    if (!newMaker.trim() || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch("/api/admin/grips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maker: newMaker.trim(),
          name: newName.trim(),
          material: newMaterial || null,
        }),
      });
      if (res.ok) {
        setNewMaker("");
        setNewName("");
        setNewMaterial("");
        await mutate();
      }
    } finally {
      setCreating(false);
    }
  }

  const models = data?.data ?? [];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          グリップ一覧
          {data && (
            <span className="ml-2 text-base font-normal text-[#888]">
              ({data.total}件)
            </span>
          )}
        </h1>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="メーカー・名前で検索..."
          className="rounded border border-[#dfdfdf] bg-white px-3 py-1.5 text-sm text-black outline-none focus:border-[#006728] w-64"
        />
      </div>

      {/* 新規モデル作成 */}
      <div className="rounded-lg bg-white border border-[#e5e5e5] p-4 space-y-2">
        <p className="text-sm font-bold text-[#006728]">新規モデル作成</p>
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">メーカー</label>
            <input
              type="text"
              value={newMaker}
              onChange={(e) => setNewMaker(e.target.value)}
              placeholder="Golf Pride"
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">グリップ名</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tour Velvet"
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">素材</label>
            <select
              value={newMaterial}
              onChange={(e) => setNewMaterial(e.target.value)}
              className={inputCls}
            >
              <option value="">未設定</option>
              <option value="ラバー">ラバー</option>
              <option value="コード">コード</option>
              <option value="エラストマー">エラストマー</option>
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newMaker.trim() || !newName.trim()}
            className="shrink-0 rounded-full bg-[#006728] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {creating ? "作成中..." : "作成"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-[#8b8b8b]">読み込み中...</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">メーカー</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">グリップ名</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">素材</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">バリアント数</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                expandedId === m.id ? (
                  <ModelExpanded
                    key={m.id}
                    model={m}
                    onSaved={() => { setExpandedId(null); mutate(); }}
                    onClose={() => setExpandedId(null)}
                  />
                ) : (
                  <tr
                    key={m.id}
                    onClick={() => setExpandedId(m.id)}
                    className="border-b border-[#f0f0f0] hover:bg-[#fafafa] cursor-pointer"
                  >
                    <td className="px-3 py-2">{m.maker}</td>
                    <td className="px-3 py-2">{m.name}</td>
                    <td className="px-3 py-2">{m.material ?? "-"}</td>
                    <td className="px-3 py-2">
                      <span className="inline-block rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[11px] text-[#555]">
                        {m.variants.length}件
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {m.verified
                        ? <span className="rounded-full bg-[#006728] px-2 py-0.5 text-[10px] font-bold text-white">確認済</span>
                        : <span className="text-[10px] text-[#8b8b8b]">未確認</span>}
                    </td>
                  </tr>
                )
              ))}
              {models.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-[#8b8b8b]">データがありません</td></tr>
              )}
            </tbody>
          </table>
          {/* Pagination */}
          {data && data.total > 20 && (
            <div className="flex items-center justify-between border-t border-[#e5e5e5] px-3 py-2">
              <span className="text-xs text-[#888]">
                {data.total}件中 {(page - 1) * 20 + 1}-{Math.min(page * 20, data.total)}件
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border border-[#dfdfdf] px-2 py-0.5 text-xs disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= data.total}
                  className="rounded border border-[#dfdfdf] px-2 py-0.5 text-xs disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Page ── */

export default function AdminGripsPage() {
  return (
    <Suspense>
      <GripsList />
    </Suspense>
  );
}
