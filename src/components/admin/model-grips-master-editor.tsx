"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";

interface GripMaster {
  id: string;
  grip_name: string;
  maker: string | null;
  grip_size: string | null;
  weight: number | null;
  material: string | null;
}

const GRIP_ROWS: { key: keyof GripMaster; label: string }[] = [
  { key: "grip_size", label: "サイズ" },
  { key: "weight", label: "重量(g)" },
  { key: "material", label: "素材" },
];

async function fetcher<T>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (!res.ok) return [] as unknown as T;
  return res.json();
}

function cleanMaterial(m: string | null): string {
  if (!m) return "";
  return m.replace(/\s*\[BL:(有|無)\]/, "").trim();
}

function decodeBL(m: string | null): string {
  if (!m) return "";
  if (m.includes("[BL:有]")) return "有";
  if (m.includes("[BL:無]")) return "無";
  return "";
}

interface Props {
  modelId: string;
  linkedGripNames: string[];
  onLink: (name: string) => void;
  onUnlink: (name: string) => void;
}

export function ModelGripsMasterEditor({ modelId, linkedGripNames, onLink, onUnlink }: Props) {
  const { data: allGrips = [] } = useSWR<GripMaster[]>(
    "/api/admin/catalog/grips",
    (url: string) => fetcher<GripMaster[]>(url)
  );

  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const linkedSet = new Set(linkedGripNames);
  const linkedGrips = allGrips.filter((g) => linkedSet.has(g.grip_name));

  // Group by grip_name
  const groups: { name: string; entries: GripMaster[] }[] = [];
  for (const g of linkedGrips) {
    const existing = groups.find((gr) => gr.name === g.grip_name);
    if (existing) existing.entries.push(g);
    else groups.push({ name: g.grip_name, entries: [g] });
  }

  // Visible rows: only show if at least one grip has data
  const visibleRows = GRIP_ROWS.filter((r) =>
    linkedGrips.some((g) => g[r.key] != null)
  );
  // Add BL row if any grip has backline info
  const hasBL = linkedGrips.some((g) => decodeBL(g.material));

  const uniqueNames = [...new Set(allGrips.map((g) => g.grip_name))];

  return (
    <div className="space-y-2">
      {groups.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                <th className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-left text-[11px] text-[#888] font-medium min-w-[100px]">項目</th>
                {groups.map((g) => (
                  <th key={g.name} colSpan={g.entries.length} className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-center text-[11px] font-medium whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {g.name}
                      <button onClick={() => onUnlink(g.name)} className="text-[#ccc] hover:text-red-600 text-xs" title="削除">&times;</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.key}>
                  <td className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-1.5 text-xs font-medium text-[#555]">{row.label}</td>
                  {groups.flatMap((g) => {
                    const values = g.entries.map((e) => {
                      const v = e[row.key];
                      if (row.key === "material") return cleanMaterial(v as string | null);
                      return v != null ? String(v) : "-";
                    });
                    const allSame = values.every((v) => v === values[0]);
                    if (allSame) {
                      return [<td key={g.name} colSpan={g.entries.length} className="border border-[#e5e5e5] px-3 py-1.5 text-center text-xs">{values[0] || "-"}</td>];
                    }
                    return g.entries.map((e, i) => (
                      <td key={`${g.name}-${i}`} className="border border-[#e5e5e5] px-3 py-1.5 text-center text-xs">{values[i] || "-"}</td>
                    ));
                  })}
                </tr>
              ))}
              {hasBL && (
                <tr>
                  <td className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-1.5 text-xs font-medium text-[#555]">BL</td>
                  {groups.flatMap((g) => {
                    const values = g.entries.map((e) => decodeBL(e.material));
                    const allSame = values.every((v) => v === values[0]);
                    if (allSame) {
                      return [<td key={g.name} colSpan={g.entries.length} className="border border-[#e5e5e5] px-3 py-1.5 text-center text-xs">{values[0] || "-"}</td>];
                    }
                    return g.entries.map((e, i) => (
                      <td key={`${g.name}-bl-${i}`} className="border border-[#e5e5e5] px-3 py-1.5 text-center text-xs">{values[i] || "-"}</td>
                    ));
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[#888]">グリップが追加されていません</p>
      )}

      {adding ? (
        <div className="space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="グリップ名で検索..."
            className="h-8 w-64 rounded border border-input bg-background px-3 text-xs"
            autoFocus
          />
          {search.length >= 1 && (
            <div className="max-h-48 overflow-y-auto border border-[#e5e5e5] rounded-md bg-white">
              {uniqueNames
                .filter((name) => {
                  if (linkedSet.has(name)) return false;
                  return name.toLowerCase().includes(search.toLowerCase());
                })
                .slice(0, 20)
                .map((name) => {
                  const sample = allGrips.find((g) => g.grip_name === name);
                  const count = allGrips.filter((g) => g.grip_name === name).length;
                  return (
                    <button
                      key={name}
                      onClick={() => { onLink(name); setSearch(""); setAdding(false); }}
                      className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[#f5f5f5] border-b border-[#f0f0f0]"
                    >
                      <span className="font-medium">{name}</span>
                      {sample?.maker && <span className="ml-2 text-[#aaa]">({sample.maker})</span>}
                      {count > 1 && <span className="ml-1 text-[#bbb]">{count}種</span>}
                    </button>
                  );
                })}
              {uniqueNames.filter((n) => !linkedSet.has(n) && n.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <p className="px-3 py-2 text-xs text-[#aaa]">見つかりません</p>
              )}
            </div>
          )}
          <button onClick={() => { setAdding(false); setSearch(""); }} className="text-xs text-[#888] hover:underline">キャンセル</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs font-bold text-[#006728] hover:underline">
          ＋ グリップ追加
        </button>
      )}
    </div>
  );
}
