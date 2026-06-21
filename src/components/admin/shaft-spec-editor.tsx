"use client";

import { useState } from "react";

interface SpecRow {
  id: string;
  club_number: string;
  shaft_name: string | null;
  shaft_flex: string | null;
  weight: number | null;
  swing_weight: string | null;
  [key: string]: unknown;
}

interface ShaftOption {
  id: string;
  shaft_name: string;
  flex: string | null;
}

interface ShaftSpecField {
  key: string;
  label: string;
  type: "number" | "string";
}

const SHAFT_SPEC_FIELDS: ShaftSpecField[] = [
  { key: "weight", label: "重量(g)", type: "number" },
  { key: "swing_weight", label: "バランス", type: "string" },
];

interface ShaftSpecEditorProps {
  specs: SpecRow[];
  clubNumbers: string[];
  shaftOptions: ShaftOption[];
  onChange: (specs: SpecRow[]) => void;
  onAddShaft: (shaftName: string, shaftFlex: string) => void;
  onRemoveShaft: (shaftName: string, shaftFlex: string) => void;
}

export function ShaftSpecEditor({ specs, clubNumbers, shaftOptions, onChange, onAddShaft, onRemoveShaft }: ShaftSpecEditorProps) {
  const [visibleFields, setVisibleFields] = useState<string[]>(["weight", "swing_weight"]);
  const [addingShaft, setAddingShaft] = useState(false);
  const [selectedShaftId, setSelectedShaftId] = useState("");

  // Group specs by shaft_name + shaft_flex
  const shaftGroups: { name: string; flex: string; rows: SpecRow[] }[] = [];
  const shaftSpecs = specs.filter((s) => s.shaft_name);
  const seen = new Set<string>();
  for (const s of shaftSpecs) {
    const key = `${s.shaft_name}|${s.shaft_flex}`;
    if (!seen.has(key)) {
      seen.add(key);
      shaftGroups.push({
        name: s.shaft_name!,
        flex: s.shaft_flex ?? "",
        rows: shaftSpecs.filter((r) => r.shaft_name === s.shaft_name && r.shaft_flex === s.shaft_flex),
      });
    }
  }

  function updateCell(shaftName: string, shaftFlex: string, clubNumber: string, field: string, value: string) {
    const updated = specs.map((s) => {
      if (s.shaft_name !== shaftName || s.shaft_flex !== shaftFlex || s.club_number !== clubNumber) return s;
      const parsed = value === "" ? null : isNaN(Number(value)) ? value : Number(value);
      return { ...s, [field]: parsed };
    });
    onChange(updated);
  }

  function getCellValue(rows: SpecRow[], clubNumber: string, field: string): string {
    const spec = rows.find((s) => s.club_number === clubNumber);
    const val = spec?.[field];
    return val != null ? String(val) : "";
  }

  function handleAddShaft() {
    const shaft = shaftOptions.find((s) => s.id === selectedShaftId);
    if (!shaft) return;
    onAddShaft(shaft.shaft_name, shaft.flex ?? "");
    setSelectedShaftId("");
    setAddingShaft(false);
  }

  const colors = ["bg-white", "bg-[#f8faf8]"];

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr>
              <th className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-left text-[11px] text-[#888] font-medium min-w-[160px]">
                シャフト / 項目
              </th>
              {clubNumbers.map((cn) => (
                <th key={cn} className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-center text-[11px] font-medium min-w-[80px]">
                  {cn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shaftGroups.map((group, gi) => (
              visibleFields.map((fieldKey, fi) => {
                const field = SHAFT_SPEC_FIELDS.find((f) => f.key === fieldKey);
                if (!field) return null;
                return (
                  <tr key={`${group.name}-${group.flex}-${fieldKey}`} className={colors[gi % 2]}>
                    <td className="border border-[#e5e5e5] px-3 py-1.5 text-xs">
                      {fi === 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#333]">{group.name} {group.flex}</span>
                          <button
                            onClick={() => onRemoveShaft(group.name, group.flex)}
                            className="text-[#ccc] hover:text-red-600 text-xs ml-1"
                          >
                            &times;
                          </button>
                        </div>
                      )}
                      <span className="text-[#888]">{field.label}</span>
                    </td>
                    {clubNumbers.map((cn) => (
                      <td key={cn} className="border border-[#e5e5e5] px-1 py-0.5">
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          step="any"
                          value={getCellValue(group.rows, cn, fieldKey)}
                          onChange={(e) => updateCell(group.name, group.flex, cn, fieldKey, e.target.value)}
                          className="w-full text-center text-xs px-1 py-1 bg-transparent focus:bg-white focus:outline focus:outline-[#006728] rounded"
                          placeholder="-"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })
            ))}
          </tbody>
        </table>
      </div>

      {addingShaft ? (
        <div className="flex items-center gap-2">
          <select
            value={selectedShaftId}
            onChange={(e) => setSelectedShaftId(e.target.value)}
            className="h-7 rounded border border-input bg-background px-2 text-xs"
          >
            <option value="">シャフトを選択...</option>
            {shaftOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shaft_name} {s.flex ?? ""}
              </option>
            ))}
          </select>
          <button onClick={handleAddShaft} className="text-xs font-bold text-[#006728] hover:underline">追加</button>
          <button onClick={() => setAddingShaft(false)} className="text-xs text-[#888] hover:underline">キャンセル</button>
        </div>
      ) : (
        <button
          onClick={() => setAddingShaft(true)}
          className="text-xs font-bold text-[#006728] hover:underline"
        >
          ＋ シャフト追加
        </button>
      )}
    </div>
  );
}
