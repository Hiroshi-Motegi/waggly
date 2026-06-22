import type { CatalogGrip } from "@/lib/catalog";
import { ScrollableTable } from "@/components/ui/scrollable-table";

const GRIP_ROWS: { key: keyof CatalogGrip; label: string }[] = [
  { key: "grip_size", label: "サイズ" },
  { key: "weight", label: "重量(g)" },
  { key: "material", label: "素材" },
];

function cleanMaterial(m: string | null): string {
  if (!m) return "";
  return m.replace(/\s*\[BL:(有|無)\]/, "").trim();
}

function decodeBL(m: string | null): string {
  if (!m) return "";
  if (m.includes("[BL:有]")) return "有";
  if (m.includes("[BL:無]")) return "無";
  return "";
}

interface GripInfoTableProps {
  grips: CatalogGrip[];
}

export function GripInfoTable({ grips }: GripInfoTableProps) {
  if (grips.length === 0) return null;

  // Group by grip_name
  const groups: { name: string; entries: CatalogGrip[] }[] = [];
  for (const g of grips) {
    const existing = groups.find((gr) => gr.name === g.grip_name);
    if (existing) existing.entries.push(g);
    else groups.push({ name: g.grip_name, entries: [g] });
  }

  const visibleRows = GRIP_ROWS.filter((row) =>
    grips.some((g) => g[row.key] != null)
  );
  const hasBL = grips.some((g) => decodeBL(g.material));

  return (
    <ScrollableTable>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[100px] bg-[#006728] px-3 py-2 text-left text-xs font-bold text-white">
              グリップ
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
                const values = g.entries.map((e) => {
                  const v = e[row.key];
                  if (row.key === "material") return cleanMaterial(v as string | null);
                  return v != null ? String(v) : "—";
                });
                const allSame = values.every((v) => v === values[0]);
                if (allSame) {
                  return [<td key={g.name} colSpan={g.entries.length} className="px-3 py-2 text-center text-xs text-[#444] whitespace-nowrap">{values[0] || "—"}</td>];
                }
                return g.entries.map((e, i) => (
                  <td key={e.id} className="px-3 py-2 text-center text-xs text-[#444] whitespace-nowrap">{values[i] || "—"}</td>
                ));
              })}
            </tr>
          ))}
          {hasBL && (
            <tr className={visibleRows.length % 2 === 0 ? "bg-white" : "bg-[#f5faf7]"}>
              <td className="sticky left-0 z-10 min-w-[100px] bg-inherit px-3 py-2 text-xs font-medium text-[#333] whitespace-nowrap border-r border-[#e0e0e0]">
                BL
              </td>
              {groups.flatMap((g) => {
                const values = g.entries.map((e) => decodeBL(e.material));
                const allSame = values.every((v) => v === values[0]);
                if (allSame) {
                  return [<td key={g.name} colSpan={g.entries.length} className="px-3 py-2 text-center text-xs text-[#444] whitespace-nowrap">{values[0] || "—"}</td>];
                }
                return g.entries.map((e, i) => (
                  <td key={e.id} className="px-3 py-2 text-center text-xs text-[#444] whitespace-nowrap">{values[i] || "—"}</td>
                ));
              })}
            </tr>
          )}
        </tbody>
      </table>
    </ScrollableTable>
  );
}
