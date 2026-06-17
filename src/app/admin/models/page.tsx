"use client";

import { useState } from "react";
import { Suspense } from "react";
import { useAdminList } from "@/hooks/admin/use-admin-list";
import { apiFetch } from "@/lib/api-client";

/* ── Types ── */

interface ProductLine {
  id: string;
  maker: string;
  name: string;
  image_url: string | null;
  affiliate_url: string | null;
  verified: boolean;
  club_model_count: number;
}

/* ── Constants ── */

const inputCls =
  "rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]";

/* ── Expanded Row (inline edit) ── */

function ModelExpanded({
  model,
  onSaved,
  onClose,
}: {
  model: ProductLine;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    maker: model.maker,
    name: model.name,
    image_url: model.image_url ?? "",
    affiliate_url: model.affiliate_url ?? "",
    verified: model.verified,
  });
  const [saving, setSaving] = useState(false);

  async function handleSaveModel() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/product-lines", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: model.id,
          action: "update",
          data: {
            maker: form.maker,
            name: form.name,
            image_url: form.image_url || null,
            affiliate_url: form.affiliate_url || null,
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
    if (!confirm(`「${model.maker} ${model.name}」を削除しますか？\nこのモデルに紐づくクラブモデルもすべて削除されます。`)) return;
    await apiFetch("/api/admin/product-lines", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: model.id }),
    });
    onSaved();
  }

  return (
    <tr className="bg-[#fafdf7] border-b border-[#e5e5e5]">
      <td colSpan={5} className="px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
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
            <label className="text-[10px] text-[#8b8b8b]">モデル名</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">画像URL</label>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
              className={inputCls}
              placeholder="-"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">アフィリエイトURL</label>
            <input
              type="url"
              value={form.affiliate_url}
              onChange={(e) => setForm((p) => ({ ...p, affiliate_url: e.target.value }))}
              className={inputCls}
              placeholder="-"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={() => setForm((p) => ({ ...p, verified: !p.verified }))}
              className="rounded accent-[#006728]"
            />
            <span className="text-sm">{form.verified ? "確認済" : "未確認"}</span>
          </label>
          <button type="button" onClick={handleDeleteModel} className="ml-4 text-xs font-bold text-red-500 hover:text-red-700">
            モデル削除
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#dfdfdf] px-3 py-1 text-xs font-bold text-[#333] hover:bg-[#f5f5f5]"
          >
            閉じる
          </button>
          <button
            type="button"
            onClick={handleSaveModel}
            disabled={saving}
            className="rounded-full bg-[#006728] px-4 py-1 text-xs font-bold text-white disabled:opacity-40"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Inner list component ── */

function ModelsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newMaker, setNewMaker] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data, isLoading, mutate } = useAdminList<ProductLine>("product-lines", {
    page,
    pageSize: 20,
    ...(search ? { search } : {}),
  });

  async function handleCreate() {
    if (!newMaker.trim() || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch("/api/admin/product-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maker: newMaker.trim(),
          name: newName.trim(),
        }),
      });
      if (res.ok) {
        setNewMaker("");
        setNewName("");
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
          モデル一覧
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
          placeholder="メーカー・モデル名で検索..."
          className="rounded border border-[#dfdfdf] bg-white px-3 py-1.5 text-sm text-black outline-none focus:border-[#006728] w-64"
        />
      </div>

      {/* 新規作成 */}
      <div className="rounded-lg bg-white border border-[#e5e5e5] p-4 space-y-2">
        <p className="text-sm font-bold text-[#006728]">新規モデル作成</p>
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">メーカー</label>
            <input
              type="text"
              value={newMaker}
              onChange={(e) => setNewMaker(e.target.value)}
              placeholder="PING"
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">モデル名</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="G440"
              className={inputCls}
            />
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
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">モデル名</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">クラブ数</th>
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
                    <td className="px-3 py-2">
                      <span className="inline-block rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[11px] text-[#555]">
                        {m.club_model_count}件
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
                <tr><td colSpan={4} className="px-3 py-6 text-center text-[#8b8b8b]">データがありません</td></tr>
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

export default function AdminModelsPage() {
  return (
    <Suspense>
      <ModelsList />
    </Suspense>
  );
}
