"use client";

import { useState } from "react";

interface SpecRow {
  id: string;
  club_number: string;
  model_id: string;
  loft: number | null;
  lie: number | null;
  length: number | null;
  bounce: number | null;
  head_volume: number | null;
  head_weight: number | null;
  face_angle: number | null;
  weight: number | null;
  swing_weight: string | null;
  shaft_name: string | null;
  shaft_flex: string | null;
  sort_order: number;
  [key: string]: unknown;
}

interface SpecField {
  key: string;
  label: string;
  type: "number" | "string";
}

const ALL_SPEC_FIELDS: SpecField[] = [
  { key: "loft", label: "ロフト角(°)", type: "number" },
  { key: "lie", label: "ライ角(°)", type: "number" },
  { key: "length", label: "クラブ長さ(inch)", type: "number" },
  { key: "bounce", label: "バンス角(°)", type: "number" },
  { key: "head_volume", label: "ヘッド体積(cc)", type: "number" },
  { key: "head_weight", label: "ヘッド重量(g)", type: "number" },
  { key: "face_angle", label: "フェース角(°)", type: "number" },
  { key: "weight", label: "総重量(g)", type: "number" },
  { key: "swing_weight", label: "バランス", type: "string" },
];

const DEFAULT_FIELDS = ["loft", "lie", "length"];

interface SpecGridEditorProps {
  modelId: string;
  specs: SpecRow[];
  onChange: (specs: SpecRow[]) => void;
  onAddClubNumber: (clubNumber: string) => void;
  onRemoveClubNumber: (clubNumber: string) => void;
}

export function SpecGridEditor({ modelId, specs, onChange, onAddClubNumber, onRemoveClubNumber }: SpecGridEditorProps) {
  // Head specs: rows where shaft_name is null (pure head specs)
  const headSpecs = specs.filter((s) => !s.shaft_name);
  const clubNumbers = [...new Set(headSpecs.map((s) => s.club_number))];

  const [visibleFields, setVisibleFields] = useState<string[]>(() => {
    // Show fields that have at least one non-null value, plus defaults
    const withData = ALL_SPEC_FIELDS
      .filter((f) => headSpecs.some((s) => s[f.key] != null))
      .map((f) => f.key);
    return [...new Set([...DEFAULT_FIELDS, ...withData])];
  });

  const [newClubNumber, setNewClubNumber] = useState("");

  function updateCell(clubNumber: string, field: string, value: string) {
    const updated = specs.map((s) => {
      if (s.club_number !== clubNumber || s.shaft_name) return s;
      const parsed = value === "" ? null : isNaN(Number(value)) ? value : Number(value);
      return { ...s, [field]: parsed };
    });
    onChange(updated);
  }

  function getCellValue(clubNumber: string, field: string): string {
    const spec = headSpecs.find((s) => s.club_number === clubNumber);
    const val = spec?.[field];
    return val != null ? String(val) : "";
  }

  function addField(key: string) {
    if (!visibleFields.includes(key)) {
      setVisibleFields([...visibleFields, key]);
    }
  }

  function handleAddClubNumber() {
    const cn = newClubNumber.trim();
    if (!cn || clubNumbers.includes(cn)) return;
    onAddClubNumber(cn);
    setNewClubNumber("");
  }

  const availableFields = ALL_SPEC_FIELDS.filter((f) => !visibleFields.includes(f.key));

  return (
    <div className="space-y-2">
      {/* Add club number */}
      <div className="flex items-center gap-2">
        <input
          value={newClubNumber}
          onChange={(e) => setNewClubNumber(e.target.value)}
          placeholder="番手名（例: 7番, PW）"
          className="h-7 w-32 rounded border border-input px-2 text-xs"
          onKeyDown={(e) => { if (e.key === "Enter") handleAddClubNumber(); }}
        />
        <button
          onClick={handleAddClubNumber}
          className="flex items-center gap-1 h-7 rounded bg-[#006728] px-3 text-xs font-bold text-white hover:bg-[#005520]"
        >
          ＋ 追加
        </button>
      </div>

      {clubNumbers.length === 0 ? (
        <p className="text-sm text-[#888]">ヘッドスペックがありません</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-left text-[11px] text-[#888] font-medium min-w-[140px]">
                    スペック項目
                  </th>
                  {clubNumbers.map((cn) => (
                    <th key={cn} className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-center text-[11px] font-medium min-w-[80px]">
                      <div className="flex items-center justify-center gap-1">
                        {cn}
                        <button
                          onClick={() => onRemoveClubNumber(cn)}
                          className="text-[#ccc] hover:text-red-600 text-xs"
                          title="番手を削除"
                        >
                          &times;
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleFields.map((fieldKey) => {
                  const field = ALL_SPEC_FIELDS.find((f) => f.key === fieldKey);
                  if (!field) return null;
                  return (
                    <tr key={fieldKey}>
                      <td className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-1.5 text-xs font-medium text-[#555]">
                        {field.label}
                      </td>
                      {clubNumbers.map((cn) => (
                        <td key={cn} className="border border-[#e5e5e5] px-1 py-0.5">
                          <input
                            type={field.type === "number" ? "number" : "text"}
                            step="any"
                            value={getCellValue(cn, fieldKey)}
                            onChange={(e) => updateCell(cn, fieldKey, e.target.value)}
                            className="w-full text-center text-xs px-1 py-1 bg-transparent focus:bg-white focus:outline focus:outline-[#006728] rounded"
                            placeholder="-"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {availableFields.length > 0 && clubNumbers.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#888]">項目追加:</span>
          <select
            onChange={(e) => { if (e.target.value) addField(e.target.value); e.target.value = ""; }}
            className="h-7 rounded border border-input bg-background px-2 text-xs"
            defaultValue=""
          >
            <option value="" disabled>選択...</option>
            {availableFields.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
