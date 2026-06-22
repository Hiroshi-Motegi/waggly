import type { CatalogSpec } from "@/lib/catalog";
import { ScrollableTable } from "@/components/ui/scrollable-table";

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

// --- Helpers ---

function getVisibleKeys(specs: CatalogSpec[], category: string): SpecKey[] {
  const preferred = CATEGORY_SPECS[category] ?? [];
  const allKeys = Object.keys(SPEC_LABELS) as SpecKey[];
  const withData = allKeys.filter((key) =>
    specs.some((s) => s[key] !== null && s[key] !== undefined)
  );
  return [
    ...preferred.filter((k) => withData.includes(k)),
    ...withData.filter((k) => !preferred.includes(k)),
  ];
}

// --- Component ---

interface SpecTableProps {
  specs: CatalogSpec[];
  category: string;
}

export function SpecTable({ specs, category }: SpecTableProps) {
  const headSpecs = specs.filter((s) => !s.shaft_name).sort((a, b) => a.sort_order - b.sort_order);
  const shaftSpecs = specs.filter((s) => !!s.shaft_name).sort((a, b) => a.sort_order - b.sort_order);

  // Group shaft specs by shaft_name + shaft_flex
  const shaftGroups: { label: string; specs: CatalogSpec[] }[] = [];
  for (const s of shaftSpecs) {
    const label = [s.shaft_name, s.shaft_flex].filter(Boolean).join(" ");
    const existing = shaftGroups.find((g) => g.label === label);
    if (existing) existing.specs.push(s);
    else shaftGroups.push({ label, specs: [s] });
  }

  const clubNumbers = headSpecs.map((s) => s.club_number);
  const headKeys = getVisibleKeys(headSpecs, category);
  const hasShafts = shaftGroups.length > 0;

  // For shaft section: find which spec keys have data across ALL shaft groups
  const allShaftSpecs = shaftGroups.flatMap((g) => g.specs);
  const shaftKeys = hasShafts ? getVisibleKeys(allShaftSpecs, category) : [];

  // Total columns: label + (shaft name if shafts exist) + club numbers
  const headerColSpan = hasShafts ? 2 : 1;

  const rowBg = (idx: number) => idx % 2 === 0 ? "bg-white" : "bg-[#f5faf7]";

  return (
    <ScrollableTable>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th
              colSpan={headerColSpan}
              className="sticky left-0 z-10 min-w-[130px] bg-[#006728] px-3 py-2 text-left text-xs font-bold text-white"
            >
              スペック
            </th>
            {clubNumbers.map((cn) => (
              <th key={cn} className="bg-[#006728] px-3 py-2 text-center text-xs font-bold text-white whitespace-nowrap">
                {cn}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Head spec rows */}
          {headKeys.map((key, rowIdx) => (
            <tr key={key} className={rowBg(rowIdx)}>
              <td
                colSpan={headerColSpan}
                className="sticky left-0 z-10 min-w-[130px] bg-inherit px-3 py-2 text-xs font-medium text-[#333] whitespace-nowrap border-r border-[#e0e0e0]"
              >
                {SPEC_LABELS[key]}
              </td>
              {headSpecs.map((spec) => {
                const value = spec[key];
                return (
                  <td key={spec.id} className="px-3 py-2 text-center text-xs text-[#444] whitespace-nowrap">
                    {value !== null && value !== undefined ? String(value) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Shaft spec rows: field name (rowSpan) + shaft name per row */}
          {shaftKeys.map((key, keyIdx) => {
            const baseRow = headKeys.length + shaftKeys.slice(0, keyIdx).length * shaftGroups.length;
            return shaftGroups.map((group, gIdx) => {
              const specByClub = new Map(group.specs.map((s) => [s.club_number, s]));
              return (
                <tr key={`${key}-${group.label}`} className={rowBg(baseRow + gIdx)}>
                  {gIdx === 0 && (
                    <td
                      rowSpan={shaftGroups.length}
                      className="sticky left-0 z-10 min-w-[80px] bg-white px-3 py-2 text-xs font-medium text-[#333] whitespace-nowrap border-r border-[#e0e0e0] align-middle"
                    >
                      {SPEC_LABELS[key]}
                    </td>
                  )}
                  <td className="sticky left-[80px] z-10 bg-inherit px-2 py-2 text-[11px] text-[#555] whitespace-nowrap border-r border-[#e0e0e0]">
                    {group.label}
                  </td>
                  {clubNumbers.map((cn) => {
                    const value = specByClub.get(cn)?.[key];
                    return (
                      <td key={cn} className="px-3 py-2 text-center text-xs text-[#444] whitespace-nowrap">
                        {value !== null && value !== undefined ? String(value) : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </ScrollableTable>
  );
}
