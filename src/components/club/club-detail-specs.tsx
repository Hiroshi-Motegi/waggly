"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Club, ClubCategory } from "@/types/database";
import { FieldError } from "@/components/ui/field-error";

const kickPointOptions = ["先調子", "先中調子", "中調子", "中元調子", "元調子"];
const gripSizeOptions = ["M58", "M60", "M62", "J"];

const inputClass = "w-[100px] rounded-lg border border-[#c4c4c4] bg-white px-2 py-1.5 text-center text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

interface Props {
  form: Partial<Club>;
  onChange: (key: string, value: string | number | undefined | null) => void;
  fieldError?: (field: string) => string | null;
  category?: ClubCategory;
}

function SpecRow({ label, unit, children, fieldName, fieldError, last }: {
  label: string;
  unit?: string;
  children: React.ReactNode;
  fieldName?: string;
  fieldError?: (field: string) => string | null;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "border-b border-[#ececec]"} data-field={fieldName}>
      <div className="flex items-center py-3">
        <span className="flex-1 text-base">{label}</span>
        {children}
        <span className="w-[32px] text-sm text-left pl-1">{unit ?? ""}</span>
      </div>
      {fieldName && fieldError?.(fieldName) && <FieldError message={fieldError(fieldName)} />}
    </div>
  );
}

export function ClubDetailSpecs({ form, onChange, fieldError, category }: Props) {
  const cat = category ?? form.category;
  const isPutter = cat === "putter";

  const hasData =
    form.weight != null ||
    form.swing_weight != null ||
    form.frequency != null ||
    form.kick_point != null ||
    form.head_volume != null ||
    form.head_weight != null ||
    form.grip_name != null ||
    form.grip_size != null ||
    form.shaft_weight != null;

  const [isOpen, setIsOpen] = useState(hasData);

  // Build visible fields based on category
  const showShaftWeight = !isPutter;
  const showFrequency = !isPutter;
  const showKickPoint = !isPutter;
  const showHeadVolume = cat === "driver" || cat === "fairway_wood";

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center py-3"
      >
        <span className="flex-1 text-left text-base text-[#8b8b8b]">詳細スペック</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
      </button>

      {isOpen && (
        <>
          {/* グリップ */}
          <SpecRow label="グリップ" fieldName="grip_name" fieldError={fieldError}>
            <input type="text" value={form.grip_name ?? ""} onChange={(e) => onChange("grip_name", e.target.value || undefined)} placeholder="銘柄名" className={`${inputClass} ${fieldError?.("grip_name") ? "!border-red-400" : ""}`} />
          </SpecRow>
          <SpecRow label="グリップ太さ" fieldName="grip_size" fieldError={fieldError}>
            <select value={form.grip_size ?? ""} onChange={(e) => onChange("grip_size", e.target.value || undefined)} className={`${inputClass} ${fieldError?.("grip_size") ? "!border-red-400" : ""}`}>
              <option value="">—</option>
              {gripSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </SpecRow>

          {/* シャフト重量 */}
          {showShaftWeight && (
            <SpecRow label="シャフト重量" unit="g" fieldName="shaft_weight" fieldError={fieldError}>
              <input type="number" step="1" min={0} max={200} value={form.shaft_weight ?? ""} onChange={(e) => onChange("shaft_weight", e.target.value ? Number(e.target.value) : undefined)} placeholder="—" className={`${inputClass} ${fieldError?.("shaft_weight") ? "!border-red-400" : ""}`} />
            </SpecRow>
          )}

          {/* 総重量 */}
          <SpecRow label="総重量" unit="g" fieldName="weight" fieldError={fieldError}>
            <input type="number" step="0.1" min={0} max={1000} value={form.weight ?? ""} onChange={(e) => onChange("weight", e.target.value ? Number(e.target.value) : undefined)} placeholder="—" className={`${inputClass} ${fieldError?.("weight") ? "!border-red-400" : ""}`} />
          </SpecRow>

          {/* バランス */}
          <SpecRow label="バランス" fieldName="swing_weight" fieldError={fieldError}>
            <input type="text" value={form.swing_weight ?? ""} onChange={(e) => onChange("swing_weight", e.target.value || undefined)} placeholder="D2" className={`${inputClass} ${fieldError?.("swing_weight") ? "!border-red-400" : ""}`} />
          </SpecRow>

          {/* 振動数 */}
          {showFrequency && (
            <SpecRow label="振動数" unit="cpm" fieldName="frequency" fieldError={fieldError}>
              <input type="number" min={0} max={500} value={form.frequency ?? ""} onChange={(e) => onChange("frequency", e.target.value ? Number(e.target.value) : undefined)} placeholder="—" className={`${inputClass} ${fieldError?.("frequency") ? "!border-red-400" : ""}`} />
            </SpecRow>
          )}

          {/* キックポイント */}
          {showKickPoint && (
            <SpecRow label="キックポイント" fieldName="kick_point" fieldError={fieldError}>
              <select value={form.kick_point ?? ""} onChange={(e) => onChange("kick_point", e.target.value || undefined)} className={`${inputClass} ${fieldError?.("kick_point") ? "!border-red-400" : ""}`}>
                <option value="">—</option>
                {kickPointOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </SpecRow>
          )}

          {/* ヘッド体積 */}
          {showHeadVolume && (
            <SpecRow label="ヘッド体積" unit="cc" fieldName="head_volume" fieldError={fieldError}>
              <input type="number" min={0} max={600} value={form.head_volume ?? ""} onChange={(e) => onChange("head_volume", e.target.value ? Number(e.target.value) : undefined)} placeholder="—" className={`${inputClass} ${fieldError?.("head_volume") ? "!border-red-400" : ""}`} />
            </SpecRow>
          )}

          {/* ヘッド重量 */}
          <SpecRow label="ヘッド重量" unit="g" fieldName="head_weight" fieldError={fieldError} last>
            <input type="number" step="0.1" min={0} max={400} value={form.head_weight ?? ""} onChange={(e) => onChange("head_weight", e.target.value ? Number(e.target.value) : undefined)} placeholder="—" className={`${inputClass} ${fieldError?.("head_weight") ? "!border-red-400" : ""}`} />
          </SpecRow>
        </>
      )}
    </div>
  );
}
