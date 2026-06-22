import type { CatalogShaft } from "@/lib/catalog";
import { ScrollableTable } from "@/components/ui/scrollable-table";

const SHAFT_ROWS: { key: keyof CatalogShaft; label: string }[] = [
  { key: "shaft_type", label: "種類" },
  { key: "flex", label: "フレックス" },
  { key: "shaft_weight", label: "シャフト重量(g)" },
  { key: "torque", label: "トルク(度)" },
  { key: "kick_point", label: "キックポイント" },
];

interface ShaftInfoTableProps {
  shafts: CatalogShaft[];
}

export function ShaftInfoTable({ shafts }: ShaftInfoTableProps) {
  if (shafts.length === 0) return null;

  // Group by shaft_name
  const groups: { name: string; entries: CatalogShaft[] }[] = [];
  for (const s of shafts) {
    const existing = groups.find((g) => g.name === s.shaft_name);
    if (existing) existing.entries.push(s);
    else groups.push({ name: s.shaft_name, entries: [s] });
  }

  const visibleRows = SHAFT_ROWS.filter((row) =>
    shafts.some((s) => s[row.key] != null)
  );

  return (
    <ScrollableTable>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[100px] bg-[#006728] px-3 py-2 text-left text-xs font-bold text-white">
              シャフト
            </th>
            {groups.map((g) => (
              <th
                key={g.name}
                colSpan={g.entries.length}
                className="bg-[#006728] px-3 py-2 text-center text-xs font-bold text-white whitespace-nowrap"
              >
                {g.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, rowIdx) => (
            <tr key={row.key} className={rowIdx % 2 === 0 ? "bg-white" : "bg-[#f5faf7]"}>
              <td className="sticky left-0 z-10 min-w-[100px] bg-inherit px-3 py-2 text-xs font-medium text-[#333] whitespace-nowrap border-r border-[#e0e0e0]">
                {row.label}
              </td>
              {groups.flatMap((g) => {
                const values = g.entries.map((s) => s[row.key]);
                const allSame = values.every((v) => v === values[0]);
                if (allSame) {
                  return [(
                    <td
                      key={g.name}
                      colSpan={g.entries.length}
                      className="px-3 py-2 text-center text-xs text-[#444] whitespace-nowrap"
                    >
                      {values[0] != null ? String(values[0]) : "—"}
                    </td>
                  )];
                }
                return g.entries.map((s) => (
                  <td
                    key={s.id}
                    className="px-3 py-2 text-center text-xs text-[#444] whitespace-nowrap"
                  >
                    {s[row.key] != null ? String(s[row.key]) : "—"}
                  </td>
                ));
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTable>
  );
}
