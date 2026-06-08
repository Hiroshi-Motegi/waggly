"use client";

import { useState } from "react";
import type { Club } from "@/types/database";

const inputClass =
  "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

const kickPointOptions = ["先調子", "先中調子", "中調子", "中元調子", "元調子"];

interface Props {
  form: Partial<Club>;
  onChange: (key: string, value: string | number | undefined | null) => void;
}

export function ClubDetailSpecs({ form, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(
    form.weight != null ||
    form.swing_weight != null ||
    form.frequency != null ||
    form.kick_point != null ||
    form.head_volume != null ||
    form.head_weight != null
  );

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-2 text-xs text-[#8b8b8b]"
      >
        <span>詳細スペック（任意）</span>
        <span className="text-base">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 pb-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[#8b8b8b]">総重量 (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.weight ?? ""}
                onChange={(e) => onChange("weight", e.target.value ? Number(e.target.value) : undefined)}
                placeholder=""
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[#8b8b8b]">バランス</label>
              <input
                type="text"
                value={form.swing_weight ?? ""}
                onChange={(e) => onChange("swing_weight", e.target.value || undefined)}
                placeholder="例: D2"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[#8b8b8b]">振動数 (cpm)</label>
              <input
                type="number"
                value={form.frequency ?? ""}
                onChange={(e) => onChange("frequency", e.target.value ? Number(e.target.value) : undefined)}
                placeholder=""
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[#8b8b8b]">キックポイント</label>
              <select
                value={form.kick_point ?? ""}
                onChange={(e) => onChange("kick_point", e.target.value || undefined)}
                className={inputClass}
              >
                <option value="">—</option>
                {kickPointOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[#8b8b8b]">ヘッド体積 (cc)</label>
              <input
                type="number"
                value={form.head_volume ?? ""}
                onChange={(e) => onChange("head_volume", e.target.value ? Number(e.target.value) : undefined)}
                placeholder=""
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[#8b8b8b]">ヘッド重量 (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.head_weight ?? ""}
                onChange={(e) => onChange("head_weight", e.target.value ? Number(e.target.value) : undefined)}
                placeholder=""
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
