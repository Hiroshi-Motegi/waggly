"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Club } from "@/types/database";
import { FieldError } from "@/components/ui/field-error";

const kickPointOptions = ["先調子", "先中調子", "中調子", "中元調子", "元調子"];

interface Props {
  form: Partial<Club>;
  onChange: (key: string, value: string | number | undefined | null) => void;
  fieldError?: (field: string) => string | null;
}

export function ClubDetailSpecs({ form, onChange, fieldError }: Props) {
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
        className="flex w-full items-center gap-0.5 pt-2 text-sm text-[#8b8b8b]"
      >
        <span className="flex-1 text-left text-base">詳細スペック（任意）</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
      </button>

      {isOpen && (
        <>
          <div data-field="weight">
            <div className="flex items-center gap-0.5 py-2.5">
              <span className="flex-1 text-base">総重量</span>
              <input
                type="number"
                step="0.1"
                min={0}
                max={1000}
                value={form.weight ?? ""}
                onChange={(e) => onChange("weight", e.target.value ? Number(e.target.value) : undefined)}
                placeholder=""
                className={`w-[100px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-base focus-visible:outline-none ${fieldError?.("weight") ? "!border-b-red-400" : ""}`}
              />
              <span className="w-[30px] text-sm">g</span>
            </div>
            {fieldError?.("weight") && <FieldError message={fieldError("weight")} />}
          </div>
          <div data-field="swing_weight">
            <div className="flex items-center gap-0.5 py-2.5">
              <span className="flex-1 text-base">バランス</span>
              <input
                type="text"
                value={form.swing_weight ?? ""}
                onChange={(e) => onChange("swing_weight", e.target.value || undefined)}
                placeholder="D2"
                className={`w-[100px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-base focus-visible:outline-none ${fieldError?.("swing_weight") ? "!border-b-red-400" : ""}`}
              />
              <span className="w-[30px] text-sm"></span>
            </div>
            {fieldError?.("swing_weight") && <FieldError message={fieldError("swing_weight")} />}
          </div>
          <div data-field="frequency">
            <div className="flex items-center gap-0.5 py-2.5">
              <span className="flex-1 text-base">振動数</span>
              <input
                type="number"
                min={0}
                max={500}
                value={form.frequency ?? ""}
                onChange={(e) => onChange("frequency", e.target.value ? Number(e.target.value) : undefined)}
                placeholder=""
                className={`w-[100px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-base focus-visible:outline-none ${fieldError?.("frequency") ? "!border-b-red-400" : ""}`}
              />
              <span className="w-[30px] text-sm">cpm</span>
            </div>
            {fieldError?.("frequency") && <FieldError message={fieldError("frequency")} />}
          </div>
          <div data-field="kick_point">
            <div className="flex items-center gap-0.5 py-2.5">
              <span className="flex-1 text-base">キックポイント</span>
              <select
                value={form.kick_point ?? ""}
                onChange={(e) => onChange("kick_point", e.target.value || undefined)}
                className={`w-[100px] border-b border-[#c4c4c4] bg-white px-1 py-1 text-center text-base focus-visible:outline-none ${fieldError?.("kick_point") ? "!border-b-red-400" : ""}`}
              >
                <option value="">—</option>
                {kickPointOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <span className="w-[30px] text-sm"></span>
            </div>
            {fieldError?.("kick_point") && <FieldError message={fieldError("kick_point")} />}
          </div>
          <div data-field="head_volume">
            <div className="flex items-center gap-0.5 py-2.5">
              <span className="flex-1 text-base">ヘッド体積</span>
              <input
                type="number"
                min={0}
                max={600}
                value={form.head_volume ?? ""}
                onChange={(e) => onChange("head_volume", e.target.value ? Number(e.target.value) : undefined)}
                placeholder=""
                className={`w-[100px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-base focus-visible:outline-none ${fieldError?.("head_volume") ? "!border-b-red-400" : ""}`}
              />
              <span className="w-[30px] text-sm">cc</span>
            </div>
            {fieldError?.("head_volume") && <FieldError message={fieldError("head_volume")} />}
          </div>
          <div data-field="head_weight">
            <div className="flex items-center gap-0.5 py-2.5">
              <span className="flex-1 text-base">ヘッド重量</span>
              <input
                type="number"
                step="0.1"
                min={0}
                max={400}
                value={form.head_weight ?? ""}
                onChange={(e) => onChange("head_weight", e.target.value ? Number(e.target.value) : undefined)}
                placeholder=""
                className={`w-[100px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-base focus-visible:outline-none ${fieldError?.("head_weight") ? "!border-b-red-400" : ""}`}
              />
              <span className="w-[30px] text-sm">g</span>
            </div>
            {fieldError?.("head_weight") && <FieldError message={fieldError("head_weight")} />}
          </div>
        </>
      )}
    </div>
  );
}
