import type { CatalogModelWithSpecs, CatalogSpec } from "@/lib/catalog";
import { SPEC_LABELS, CATEGORY_SPECS, type SpecKey } from "./spec-table";

interface CompareTableProps {
  modelA: CatalogModelWithSpecs;
  modelB: CatalogModelWithSpecs;
}

export function CompareTable({ modelA, modelB }: CompareTableProps) {
  const category = modelA.category;
  const specKeys = CATEGORY_SPECS[category] ?? (Object.keys(SPEC_LABELS) as SpecKey[]);

  // Collect all unique club numbers across both models, sorted by sort_order
  const allNumbers = Array.from(
    new Set([
      ...modelA.catalog_specs.map((s) => s.club_number),
      ...modelB.catalog_specs.map((s) => s.club_number),
    ])
  );

  // Sort by sort_order from modelA first, then modelB
  const orderMap = new Map<string, number>();
  [...modelA.catalog_specs, ...modelB.catalog_specs].forEach((s) => {
    if (!orderMap.has(s.club_number)) {
      orderMap.set(s.club_number, s.sort_order);
    }
  });
  allNumbers.sort((a, b) => (orderMap.get(a) ?? 999) - (orderMap.get(b) ?? 999));

  const specMapA = new Map<string, CatalogSpec>(
    modelA.catalog_specs.map((s) => [s.club_number, s])
  );
  const specMapB = new Map<string, CatalogSpec>(
    modelB.catalog_specs.map((s) => [s.club_number, s])
  );

  const nameA = `${modelA.catalog_series.maker} ${modelA.catalog_series.name}`;
  const nameB = `${modelB.catalog_series.maker} ${modelB.catalog_series.name}`;

  let globalRowIdx = 0;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[#006728] px-3 py-2 text-left text-xs font-bold text-white whitespace-nowrap min-w-[130px]">
              項目
            </th>
            <th className="bg-[#006728] px-3 py-2 text-center text-xs font-bold text-white whitespace-nowrap min-w-[60px]">
              番手
            </th>
            <th className="bg-[#006728] px-3 py-2 text-center text-xs font-bold text-white whitespace-nowrap min-w-[140px]">
              {nameA}
            </th>
            <th className="bg-[#004d1e] px-3 py-2 text-center text-xs font-bold text-white whitespace-nowrap min-w-[140px]">
              {nameB}
            </th>
          </tr>
        </thead>
        <tbody>
          {specKeys.map((key) =>
            allNumbers.map((clubNumber) => {
              const specA = specMapA.get(clubNumber);
              const specB = specMapB.get(clubNumber);
              const valA = specA ? specA[key] : null;
              const valB = specB ? specB[key] : null;
              const isEven = globalRowIdx % 2 === 0;
              globalRowIdx++;
              return (
                <tr key={`${key}-${clubNumber}`} className={isEven ? "bg-white" : "bg-[#f5faf7]"}>
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-xs font-medium text-[#333] whitespace-nowrap border-r border-[#e0e0e0]">
                    {SPEC_LABELS[key]}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-[#555] whitespace-nowrap">
                    {clubNumber}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-[#444] whitespace-nowrap">
                    {valA !== null && valA !== undefined ? String(valA) : "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-[#444] whitespace-nowrap">
                    {valB !== null && valB !== undefined ? String(valB) : "—"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
