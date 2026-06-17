"use client";

import { useState } from "react";
import { Suspense } from "react";
import { type SortingState, type ColumnDef } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { useAdminList } from "@/hooks/admin/use-admin-list";
import { apiFetch } from "@/lib/api-client";

/* ── Types ── */

interface Shaft {
  id: string;
  maker: string;
  name: string;
  type: string | null;
  flex: string | null;
  weight: number | null;
  torque: number | null;
  kick_point: string | null;
  image_url: string | null;
  affiliate_url: string | null;
  source: string;
  verified: boolean;
}

/* ── Columns ── */

const SHAFT_TYPE_LABELS: Record<string, string> = {
  steel: "スチール",
  carbon: "カーボン",
};

const columns: ColumnDef<Shaft, any>[] = [
  {
    accessorKey: "maker",
    header: "メーカー",
    enableSorting: true,
  },
  {
    accessorKey: "name",
    header: "シャフト名",
    enableSorting: true,
  },
  {
    accessorKey: "type",
    header: "素材",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue() as string | null;
      return v ? (SHAFT_TYPE_LABELS[v] ?? v) : "-";
    },
  },
  {
    accessorKey: "flex",
    header: "フレックス",
    enableSorting: false,
    cell: ({ getValue }) => (getValue() as string | null) ?? "-",
  },
  {
    accessorKey: "weight",
    header: "重量",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return v != null ? `${v}g` : "-";
    },
  },
  {
    accessorKey: "torque",
    header: "トルク",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return v != null ? `${v}°` : "-";
    },
  },
  {
    accessorKey: "kick_point",
    header: "調子",
    enableSorting: false,
    cell: ({ getValue }) => (getValue() as string | null) ?? "-",
  },
  {
    id: "verified",
    header: "状態",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.verified ? (
        <span className="inline-block rounded-full bg-[#006728] px-2 py-0.5 text-[11px] font-bold text-white">
          確認済
        </span>
      ) : (
        <span className="text-[11px] text-[#8b8b8b]">未確認</span>
      ),
  },
];

/* ── Inline Edit Row ── */

function ShaftEditRow({
  shaft,
  onSaved,
  onClose,
}: {
  shaft: Shaft;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    maker: shaft.maker,
    name: shaft.name,
    type: shaft.type ?? "",
    flex: shaft.flex ?? "",
    weight: shaft.weight != null ? String(shaft.weight) : "",
    torque: shaft.torque != null ? String(shaft.torque) : "",
    kick_point: shaft.kick_point ?? "",
    verified: shaft.verified,
  });
  const [saving, setSaving] = useState(false);

  function parseNum(v: string): number | null {
    if (v.trim() === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/shafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: shaft.id,
          data: {
            maker: form.maker,
            name: form.name,
            type: form.type || null,
            flex: form.flex || null,
            weight: parseNum(form.weight),
            torque: parseNum(form.torque),
            kick_point: form.kick_point || null,
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
    if (!confirm(`「${shaft.maker} ${shaft.name}」を削除しますか？`)) return;
    await apiFetch("/api/admin/shafts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: shaft.id }),
    });
    onSaved();
  }

  const inputCls = "rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]";

  return (
    <tr className="bg-[#fafdf7] border-b border-[#e5e5e5]">
      <td colSpan={8} className="px-4 py-3">
        <div className="grid grid-cols-4 gap-3">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">メーカー</label>
            <input type="text" value={form.maker} onChange={(e) => setForm((p) => ({ ...p, maker: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">シャフト名</label>
            <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">素材</label>
            <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className={inputCls}>
              <option value="">未設定</option>
              <option value="steel">スチール</option>
              <option value="carbon">カーボン</option>
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">フレックス</label>
            <input type="text" value={form.flex} onChange={(e) => setForm((p) => ({ ...p, flex: e.target.value }))} className={inputCls} placeholder="S, SR, R..." />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">重量 (g)</label>
            <input type="number" step="any" value={form.weight} onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))} className={inputCls} placeholder="-" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">トルク (°)</label>
            <input type="number" step="any" value={form.torque} onChange={(e) => setForm((p) => ({ ...p, torque: e.target.value }))} className={inputCls} placeholder="-" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">調子</label>
            <input type="text" value={form.kick_point} onChange={(e) => setForm((p) => ({ ...p, kick_point: e.target.value }))} className={inputCls} placeholder="先, 中, 元..." />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">確認済</label>
            <label className="flex items-center gap-1.5 py-1.5 cursor-pointer">
              <input type="checkbox" checked={form.verified} onChange={() => setForm((p) => ({ ...p, verified: !p.verified }))} className="rounded accent-[#006728]" />
              <span className="text-sm">{form.verified ? "確認済" : "未確認"}</span>
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={handleDelete} className="text-xs font-bold text-red-500 hover:text-red-700">削除</button>
          <div className="flex-1" />
          <button onClick={onClose} className="rounded border border-[#dfdfdf] px-3 py-1 text-xs font-bold text-[#333] hover:bg-[#f5f5f5]">キャンセル</button>
          <button onClick={handleSave} disabled={saving} className="rounded-full bg-[#006728] px-4 py-1 text-xs font-bold text-white disabled:opacity-40">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Inner list component ── */

function ShaftsList() {
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMaker, setNewMaker] = useState("");
  const [newName, setNewName] = useState("");
  const [newFlex, setNewFlex] = useState("");
  const [creating, setCreating] = useState(false);

  const sort = sorting[0]?.id ?? "";
  const order = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : "";

  const { data, isLoading, mutate } = useAdminList<Shaft>("shafts", {
    page,
    pageSize: 20,
    ...(sort ? { sort, order } : {}),
    ...(search ? { search } : {}),
  });

  async function handleCreate() {
    if (!newMaker.trim() || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch("/api/admin/shafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maker: newMaker.trim(),
          name: newName.trim(),
          flex: newFlex.trim() || null,
        }),
      });
      if (res.ok) {
        setNewMaker("");
        setNewName("");
        setNewFlex("");
        await mutate();
      }
    } finally {
      setCreating(false);
    }
  }

  // Build rows manually to support inline edit expansion
  const shafts = data?.data ?? [];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          シャフト一覧
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

      {/* 新規作成 */}
      <div className="rounded-lg bg-white border border-[#e5e5e5] p-4 space-y-2">
        <p className="text-sm font-bold text-[#006728]">新規作成</p>
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">メーカー</label>
            <input type="text" value={newMaker} onChange={(e) => setNewMaker(e.target.value)} placeholder="Fujikura"
              className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">シャフト名</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Speeder NX"
              className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">フレックス</label>
            <input type="text" value={newFlex} onChange={(e) => setNewFlex(e.target.value)} placeholder="S"
              className="w-20 rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]" />
          </div>
          <button onClick={handleCreate} disabled={creating || !newMaker.trim() || !newName.trim()}
            className="shrink-0 rounded-full bg-[#006728] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40">
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
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">シャフト名</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">素材</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">フレックス</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">重量</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">トルク</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">調子</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {shafts.map((s) => (
                editingId === s.id ? (
                  <ShaftEditRow
                    key={s.id}
                    shaft={s}
                    onSaved={() => { setEditingId(null); mutate(); }}
                    onClose={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={s.id} onClick={() => setEditingId(s.id)}
                    className="border-b border-[#f0f0f0] hover:bg-[#fafafa] cursor-pointer">
                    <td className="px-3 py-2">{s.maker}</td>
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2">{s.type ? (SHAFT_TYPE_LABELS[s.type] ?? s.type) : "-"}</td>
                    <td className="px-3 py-2">{s.flex ?? "-"}</td>
                    <td className="px-3 py-2">{s.weight != null ? `${s.weight}g` : "-"}</td>
                    <td className="px-3 py-2">{s.torque != null ? `${s.torque}°` : "-"}</td>
                    <td className="px-3 py-2">{s.kick_point ?? "-"}</td>
                    <td className="px-3 py-2">
                      {s.verified
                        ? <span className="rounded-full bg-[#006728] px-2 py-0.5 text-[10px] font-bold text-white">確認済</span>
                        : <span className="text-[10px] text-[#8b8b8b]">未確認</span>}
                    </td>
                  </tr>
                )
              ))}
              {shafts.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-[#8b8b8b]">データがありません</td></tr>
              )}
            </tbody>
          </table>
          {/* Pagination */}
          {data && data.total > 20 && (
            <div className="flex items-center justify-between border-t border-[#e5e5e5] px-3 py-2">
              <span className="text-xs text-[#888]">{data.total}件中 {(page - 1) * 20 + 1}-{Math.min(page * 20, data.total)}件</span>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded border border-[#dfdfdf] px-2 py-0.5 text-xs disabled:opacity-30">←</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= data.total}
                  className="rounded border border-[#dfdfdf] px-2 py-0.5 text-xs disabled:opacity-30">→</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Page ── */

export default function AdminShaftsPage() {
  return (
    <Suspense>
      <ShaftsList />
    </Suspense>
  );
}
