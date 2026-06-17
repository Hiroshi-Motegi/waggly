import type { CatalogSpec } from "@/lib/catalog";

// --- Exported constants ---

export type SpecKey =
  | "loft"
  | "lie"
  | "bounce"
  | "length"
  | "weight"
  | "swing_weight"
  | "head_volume"
  | "head_weight"
  | "face_angle";

export const SPEC_LABELS: Record<SpecKey, string> = {
  loft: "ロフト角(°)",
  lie: "ライ角(°)",
  bounce: "バウンス角(°)",
  length: "クラブ長さ(inch)",
  weight: "総重量(g)",
  swing_weight: "バランス",
  head_volume: "ヘッド体積(cc)",
  head_weight: "ヘッド重量(g)",
  face_angle: "フェース角(°)",
};

export const CATEGORY_SPECS: Record<string, SpecKey[]> = {
  driver: ["loft", "lie", "length", "weight", "swing_weight", "head_volume", "head_weight", "face_angle"],
  fairway_wood: ["loft", "lie", "length", "weight", "swing_weight", "head_volume", "head_weight"],
  utility: ["loft", "lie", "length", "weight", "swing_weight"],
  iron: ["loft", "lie", "bounce", "length", "weight", "swing_weight"],
  wedge: ["loft", "lie", "bounce", "length", "weight", "swing_weight"],
  putter: ["loft", "lie", "length", "weight", "swing_weight"],
};

// --- Component ---

interface SpecTableProps {
  specs: CatalogSpec[];
  category: string;
}

export function SpecTable({ specs, category }: SpecTableProps) {
  const specKeys = CATEGORY_SPECS[category] ?? (Object.keys(SPEC_LABELS) as SpecKey[]);
  const sortedSpecs = [...specs].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th
              className="sticky left-0 z-10 min-w-[130px] bg-[#006728] px-3 py-2 text-left text-xs font-bold text-white"
            >
              スペック
            </th>
            {sortedSpecs.map((spec) => (
              <th
                key={spec.id}
                className="bg-[#006728] px-3 py-2 text-center text-xs font-bold text-white whitespace-nowrap"
              >
                {spec.club_number}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specKeys.map((key, rowIdx) => (
            <tr key={key} className={rowIdx % 2 === 0 ? "bg-white" : "bg-[#f5faf7]"}>
              <td className="sticky left-0 z-10 min-w-[130px] bg-inherit px-3 py-2 text-xs font-medium text-[#333] whitespace-nowrap border-r border-[#e0e0e0]">
                {SPEC_LABELS[key]}
              </td>
              {sortedSpecs.map((spec) => {
                const value = spec[key];
                return (
                  <td
                    key={spec.id}
                    className="px-3 py-2 text-center text-xs text-[#444] whitespace-nowrap"
                  >
                    {value !== null && value !== undefined ? String(value) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
