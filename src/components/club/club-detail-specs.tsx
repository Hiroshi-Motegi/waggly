"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Club } from "@/types/database";

const kickPointOptions = ["先調子", "先中調子", "中調子", "中元調子", "元調子"];

interface Props {
  form: Partial<Club>;
  onChange: (key: string, value: string | number | undefined | null) => void;
}

export function ClubDetailSpecs({ form, onChange }: Props) {
  const hasData =
    form.weight != null ||
    form.swing_weight != null ||
    form.frequency != null ||
    form.kick_point != null ||
    form.head_volume != null ||
    form.head_weight != null;

  const [isOpen, setIsOpen] = useState(hasData);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-0.5 pt-2 text-xs text-[#8b8b8b]"
      >
        <span className="flex-1 text-left">詳細スペック（任意）</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
      </button>

      {isOpen && (
        <>
          <div className="flex items-center gap-0.5 pt-2">
            <span className="flex-1 text-xs">総重量</span>
            <input
              type="number"
              step="0.1"
              value={form.weight ?? ""}
              onChange={(e) => onChange("weight", e.target.value ? Number(e.target.value) : undefined)}
              placeholder=""
              className="w-[77px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-sm focus-visible:outline-none"
            />
            <span className="w-[30px] text-xs">g</span>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="flex-1 text-xs">バランス</span>
            <input
              type="text"
              value={form.swing_weight ?? ""}
              onChange={(e) => onChange("swing_weight", e.target.value || undefined)}
              placeholder="D2"
              className="w-[77px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-sm focus-visible:outline-none"
            />
            <span className="w-[30px] text-xs"></span>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="flex-1 text-xs">振動数</span>
            <input
              type="number"
              value={form.frequency ?? ""}
              onChange={(e) => onChange("frequency", e.target.value ? Number(e.target.value) : undefined)}
              placeholder=""
              className="w-[77px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-sm focus-visible:outline-none"
            />
            <span className="w-[30px] text-xs">cpm</span>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="flex-1 text-xs">キックポイント</span>
            <select
              value={form.kick_point ?? ""}
              onChange={(e) => onChange("kick_point", e.target.value || undefined)}
              className="w-[107px] border-b border-[#c4c4c4] bg-white px-1 py-1 text-center text-sm focus-visible:outline-none"
            >
              <option value="">—</option>
              {kickPointOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="flex-1 text-xs">ヘッド体積</span>
            <input
              type="number"
              value={form.head_volume ?? ""}
              onChange={(e) => onChange("head_volume", e.target.value ? Number(e.target.value) : undefined)}
              placeholder=""
              className="w-[77px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-sm focus-visible:outline-none"
            />
            <span className="w-[30px] text-xs">cc</span>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="flex-1 text-xs">ヘッド重量</span>
            <input
              type="number"
              step="0.1"
              value={form.head_weight ?? ""}
              onChange={(e) => onChange("head_weight", e.target.value ? Number(e.target.value) : undefined)}
              placeholder=""
              className="w-[77px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-sm focus-visible:outline-none"
            />
            <span className="w-[30px] text-xs">g</span>
          </div>
        </>
      )}
    </div>
  );
}
