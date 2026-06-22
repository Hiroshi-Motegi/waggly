"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";

interface ShaftMaster {
  id: string;
  shaft_name: string;
  maker: string | null;
  shaft_type: string | null;
  flex: string | null;
  shaft_weight: number | null;
  torque: number | null;
  kick_point: string | null;
}

const SHAFT_ROWS: { key: keyof ShaftMaster; label: string }[] = [
  { key: "shaft_type", label: "種類" },
  { key: "flex", label: "フレックス" },
  { key: "shaft_weight", label: "重量(g)" },
  { key: "torque", label: "トルク(度)" },
  { key: "kick_point", label: "キックポイント" },
];

async function fetcher<T>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (!res.ok) return [] as unknown as T;
  return res.json();
}

interface Props {
  modelId: string;
}

export function ModelShaftsEditor({ modelId }: Props) {
  const { data: linkedShafts = [], mutate } = useSWR<ShaftMaster[]>(
    `/api/admin/catalog/model-shafts?model_id=${modelId}`,
    (url: string) => fetcher<ShaftMaster[]>(url)
  );
  const { data: allShafts = [] } = useSWR<ShaftMaster[]>(
    "/api/admin/catalog/shafts",
    (url: string) => fetcher<ShaftMaster[]>(url)
  );

  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  // Linked shaft names (deduplicated)
  const linkedNames = new Set(linkedShafts.map((s) => s.shaft_name));

  async function handleAdd(shaftName: string) {
    await apiFetch("/api/admin/catalog/model-shafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId, shaft_name: shaftName }),
    });
    mutate();
    setSearch("");
    setAdding(false);
  }

  async function handleRemove(shaftName: string) {
    await apiFetch("/api/admin/catalog/model-shafts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId, shaft_name: shaftName }),
    });
    mutate();
  }

  // Group by shaft_name for display
  const groups: { name: string; entries: ShaftMaster[] }[] = [];
  for (const s of linkedShafts) {
    const g = groups.find((g) => g.name === s.shaft_name);
    if (g) g.entries.push(s);
    else groups.push({ name: s.shaft_name, entries: [s] });
  }

  const visibleRows = SHAFT_ROWS.filter((r) =>
    linkedShafts.some((s) => s[r.key] != null)
  );

  // For search: deduplicate by shaft_name (show unique names only)
  const uniqueShaftNames = [...new Set(allShafts.map((s) => s.shaft_name))];

  return (
    <div className="space-y-2">
      {linkedShafts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                <th className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-left text-[11px] text-[#888] font-medium min-w-[100px]">
                  項目
                </th>
                {groups.map((g) => (
                  <th key={g.name} colSpan={g.entries.length} className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-center text-[11px] font-medium whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {g.name}
                      <button
                        onClick={() => handleRemove(g.name)}
                        className="text-[#ccc] hover:text-red-600 text-xs"
                        title="削除"
                      >
                        &times;
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.key}>
                  <td className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-1.5 text-xs font-medium text-[#555]">
                    {row.label}
                  </td>
                  {groups.flatMap((g) => {
                    const values = g.entries.map((s) => s[row.key]);
                    const allSame = values.every((v) => v === values[0]);
                    if (allSame) {
                      return [(
                        <td key={g.name} colSpan={g.entries.length} className="border border-[#e5e5e5] px-3 py-1.5 text-center text-xs">
                          {values[0] != null ? String(values[0]) : "-"}
                        </td>
                      )];
                    }
                    return g.entries.map((s) => (
                      <td key={s.id} className="border border-[#e5e5e5] px-3 py-1.5 text-center text-xs">
                        {s[row.key] != null ? String(s[row.key]) : "-"}
                      </td>
                    ));
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[#888]">シャフトが追加されていません</p>
      )}

      {adding ? (
        <div className="space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="シャフト名で検索..."
            className="h-8 w-64 rounded border border-input bg-background px-3 text-xs"
            autoFocus
          />
          {search.length >= 1 && (
            <div className="max-h-48 overflow-y-auto border border-[#e5e5e5] rounded-md bg-white">
              {uniqueShaftNames
                .filter((name) => {
                  if (linkedNames.has(name)) return false;
                  return name.toLowerCase().includes(search.toLowerCase());
                })
                .slice(0, 20)
                .map((name) => {
                  const sample = allShafts.find((s) => s.shaft_name === name);
                  return (
                    <button
                      key={name}
                      onClick={() => handleAdd(name)}
                      className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[#f5f5f5] border-b border-[#f0f0f0]"
                    >
                      <span className="font-medium">{name}</span>
                      {sample?.maker && <span className="ml-2 text-[#aaa]">({sample.maker})</span>}
                    </button>
                  );
                })
              }
              {uniqueShaftNames.filter((name) => {
                if (linkedNames.has(name)) return false;
                return name.toLowerCase().includes(search.toLowerCase());
              }).length === 0 && (
                <p className="px-3 py-2 text-xs text-[#aaa]">見つかりません</p>
              )}
            </div>
          )}
          <button onClick={() => { setAdding(false); setSearch(""); }} className="text-xs text-[#888] hover:underline">
            キャンセル
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-xs font-bold text-[#006728] hover:underline"
        >
          ＋ シャフト追加
        </button>
      )}
    </div>
  );
}
