"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { apiFetch } from "@/lib/api-client";

interface Grip {
  id: string;
  grip_name: string;
  maker: string | null;
  grip_size: string | null;
  weight: number | null;
  material: string | null;
  image_url: string | null;
  is_visible: boolean;
  verification_status: string;
}

function GripList() {
  const [search, setSearch] = useState("");

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);

  const { data: grips = [] } = useSWR<Grip[]>(
    `/api/admin/catalog/grips?${qs}`,
    async (url: string) => { const res = await apiFetch(url); return res.ok ? res.json() : []; }
  );

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[{ label: "カタログ", href: "/admin/catalog" }, { label: "グリップ管理" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          グリップ管理 <span className="text-base font-normal text-[#888]">({[...new Set(grips.map((g) => g.grip_name))].length}種)</span>
        </h1>
        <Link href="/admin/catalog/grips/new" className="rounded bg-[#006728] px-4 py-2 text-sm font-bold text-white hover:bg-[#005520]">
          ＋ 新規追加
        </Link>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="グリップ名で検索..."
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-60"
      />

      {(() => {
        // Group grips by grip_name
        const groups: { name: string; entries: Grip[] }[] = [];
        for (const g of grips) {
          const existing = groups.find((gr) => gr.name === g.grip_name);
          if (existing) existing.entries.push(g);
          else groups.push({ name: g.grip_name, entries: [g] });
        }

        if (groups.length === 0) return (
          <div className="rounded-lg bg-white border border-[#e5e5e5] p-8 text-center text-sm text-[#8b8b8b]">
            データがありません
          </div>
        );

        return (
          <div className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
                  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium w-10"></th>
                  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">グリップ名</th>
                  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">メーカー</th>
                  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">バリエーション</th>
                  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">素材</th>
                  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">BL</th>
                  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">公開</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const first = group.entries[0];
                  return (
                    <tr key={group.name} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                      <td className="px-3 py-2">
                        <div className="w-8 h-8 rounded border border-[#e5e5e5] bg-[#f5f5f5] overflow-hidden">
                          {first.image_url ? (
                            <img src={first.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="flex items-center justify-center h-full text-[8px] text-[#ccc]">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/admin/catalog/grips/${encodeURIComponent(first.id)}`} className="font-medium text-[#006728] hover:underline">
                          {group.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-xs text-[#555]">{first.maker ?? "-"}</td>
                      <td className="px-3 py-2 text-xs text-[#555]">
                        {group.entries.map((e, i) => (
                          <span key={e.id}>
                            {i > 0 && <span className="text-[#ccc] mx-1">/</span>}
                            {e.grip_size ?? "?"}{e.weight != null ? ` (${e.weight}g)` : ""}
                          </span>
                        ))}
                      </td>
                      {(() => {
                        const mat = first.material ?? "";
                        const hasBL = mat.includes("[BL:有]");
                        const noBL = mat.includes("[BL:無]");
                        const clean = mat.replace(/\s*\[BL:(有|無)\]/, "").trim();
                        return (
                          <>
                            <td className="px-3 py-2 text-xs text-[#555]">{clean || "-"}</td>
                            <td className="px-3 py-2 text-xs text-[#555]">{hasBL ? "有" : noBL ? "無" : "-"}</td>
                          </>
                        );
                      })()}
                      <td className="px-3 py-2">
                        <span className={`text-[11px] font-bold ${first.is_visible ? "text-[#006728]" : "text-[#999]"}`}>
                          {first.is_visible ? "公開" : "非公開"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}

export default function GripsPage() {
  return <Suspense><GripList /></Suspense>;
}
