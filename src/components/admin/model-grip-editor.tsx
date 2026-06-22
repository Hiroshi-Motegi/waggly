"use client";

import { useState } from "react";
import type { GripData } from "@/lib/grip-utils";
export { serializeGrips, deserializeGrips, isGripAttr } from "@/lib/grip-utils";
export type { GripData } from "@/lib/grip-utils";

const EMPTY_GRIP: GripData = { name: "", size: "", weight: "", material: "", backline: "" };

interface Props {
  grips: GripData[];
  onChange: (grips: GripData[]) => void;
}

export function ModelGripEditor({ grips, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<GripData>({ ...EMPTY_GRIP });

  function handleAdd() {
    if (!draft.name.trim()) return;
    onChange([...grips, { ...draft, name: draft.name.trim() }]);
    setDraft({ ...EMPTY_GRIP });
    setAdding(false);
  }

  function handleRemove(idx: number) {
    onChange(grips.filter((_, i) => i !== idx));
  }

  function handleUpdate(idx: number, field: keyof GripData, value: string) {
    onChange(grips.map((g, i) => i === idx ? { ...g, [field]: value } : g));
  }

  return (
    <div className="space-y-2">
      {grips.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr>
                <th className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-left text-[11px] text-[#888] font-medium">グリップ名</th>
                <th className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-left text-[11px] text-[#888] font-medium w-24">サイズ</th>
                <th className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-left text-[11px] text-[#888] font-medium w-24">重量(g)</th>
                <th className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-left text-[11px] text-[#888] font-medium w-24">素材</th>
                <th className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-left text-[11px] text-[#888] font-medium w-20">BL</th>
                <th className="border border-[#e5e5e5] bg-[#fafafa] px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {grips.map((grip, i) => (
                <tr key={i}>
                  <td className="border border-[#e5e5e5] px-1 py-0.5">
                    <input value={grip.name} onChange={(e) => handleUpdate(i, "name", e.target.value)}
                      className="w-full text-xs px-2 py-1 bg-transparent focus:bg-white focus:outline focus:outline-[#006728] rounded" />
                  </td>
                  <td className="border border-[#e5e5e5] px-1 py-0.5">
                    <input value={grip.size} onChange={(e) => handleUpdate(i, "size", e.target.value)}
                      placeholder="M60" className="w-full text-xs px-2 py-1 bg-transparent focus:bg-white focus:outline focus:outline-[#006728] rounded" />
                  </td>
                  <td className="border border-[#e5e5e5] px-1 py-0.5">
                    <input value={grip.weight} onChange={(e) => handleUpdate(i, "weight", e.target.value)}
                      placeholder="50" className="w-full text-xs px-2 py-1 bg-transparent focus:bg-white focus:outline focus:outline-[#006728] rounded" />
                  </td>
                  <td className="border border-[#e5e5e5] px-1 py-0.5">
                    <input value={grip.material} onChange={(e) => handleUpdate(i, "material", e.target.value)}
                      placeholder="ラバー" className="w-full text-xs px-2 py-1 bg-transparent focus:bg-white focus:outline focus:outline-[#006728] rounded" />
                  </td>
                  <td className="border border-[#e5e5e5] px-1 py-0.5">
                    <select value={grip.backline} onChange={(e) => handleUpdate(i, "backline", e.target.value)}
                      className="w-full text-xs px-1 py-1 bg-transparent focus:outline focus:outline-[#006728] rounded">
                      <option value="">-</option>
                      <option value="有">有</option>
                      <option value="無">無</option>
                    </select>
                  </td>
                  <td className="border border-[#e5e5e5] px-1 py-0.5 text-center">
                    <button onClick={() => handleRemove(i)} className="text-[#ccc] hover:text-red-600 text-xs">&times;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[#888]">グリップが追加されていません</p>
      )}

      {adding ? (
        <div className="flex items-end gap-2 flex-wrap">
          <label className="block text-[11px] text-[#555]">名前 *
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-0.5 block h-7 w-40 rounded border border-input px-2 text-xs" autoFocus />
          </label>
          <label className="block text-[11px] text-[#555]">サイズ
            <input value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })}
              placeholder="M60" className="mt-0.5 block h-7 w-20 rounded border border-input px-2 text-xs" />
          </label>
          <label className="block text-[11px] text-[#555]">重量(g)
            <input value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
              placeholder="50" className="mt-0.5 block h-7 w-20 rounded border border-input px-2 text-xs" />
          </label>
          <label className="block text-[11px] text-[#555]">素材
            <input value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })}
              placeholder="ラバー" className="mt-0.5 block h-7 w-24 rounded border border-input px-2 text-xs" />
          </label>
          <label className="block text-[11px] text-[#555]">BL
            <select value={draft.backline} onChange={(e) => setDraft({ ...draft, backline: e.target.value })}
              className="mt-0.5 block h-7 w-16 rounded border border-input px-1 text-xs">
              <option value="">-</option>
              <option value="有">有</option>
              <option value="無">無</option>
            </select>
          </label>
          <button onClick={handleAdd} className="h-7 rounded bg-[#006728] px-3 text-xs font-bold text-white hover:bg-[#005520]">追加</button>
          <button onClick={() => { setAdding(false); setDraft({ ...EMPTY_GRIP }); }} className="text-xs text-[#888] hover:underline">キャンセル</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs font-bold text-[#006728] hover:underline">
          ＋ グリップ追加
        </button>
      )}
    </div>
  );
}
