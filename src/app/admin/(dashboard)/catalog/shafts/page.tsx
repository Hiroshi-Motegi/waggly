"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { apiFetch } from "@/lib/api-client";

interface Shaft {
  id: string;
  shaft_name: string;
  maker: string | null;
  shaft_type: string | null;
  flex: string | null;
  image_url: string | null;
  is_visible: boolean;
  verification_status: string;
}

interface ShaftGroup {
  name: string;
  maker: string | null;
  shaft_type: string | null;
  image_url: string | null;
  flexes: string[];
  count: number;
  firstId: string;
}

function ShaftList() {
  const [search, setSearch] = useState("");
  const [shaftType, setShaftType] = useState("");

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (shaftType) qs.set("shaft_type", shaftType);

  const { data: shafts = [] } = useSWR<Shaft[]>(
    `/api/admin/catalog/shafts?${qs}`,
    async (url: string) => { const res = await apiFetch(url); return res.ok ? res.json() : []; }
  );

  // Group by shaft_name
  const groupMap = new Map<string, Shaft[]>();
  for (const s of shafts) {
    if (!groupMap.has(s.shaft_name)) groupMap.set(s.shaft_name, []);
    groupMap.get(s.shaft_name)!.push(s);
  }
  const groups: ShaftGroup[] = [...groupMap.entries()].map(([name, variants]) => ({
    name,
    maker: variants[0].maker,
    shaft_type: variants[0].shaft_type,
    image_url: variants.find((v) => v.image_url)?.image_url ?? null,
    flexes: variants.map((v) => v.flex).filter(Boolean) as string[],
    count: variants.length,
    firstId: variants[0].id,
  }));

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[{ label: "カタログ", href: "/admin/catalog" }, { label: "シャフト管理" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          シャフト管理 <span className="text-base font-normal text-[#888]">({groups.length}シリーズ)</span>
        </h1>
        <Link href="/admin/catalog/shafts/new" className="rounded bg-[#006728] px-4 py-2 text-sm font-bold text-white hover:bg-[#005520]">
          ＋ 新規追加
        </Link>
      </div>

      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="シャフト名で検索..."
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-60"
        />
        <select
          value={shaftType}
          onChange={(e) => setShaftType(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">すべての種類</option>
          <option value="カーボンシャフト">カーボン</option>
          <option value="スチールシャフト">スチール</option>
        </select>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg bg-white border border-[#e5e5e5] p-8 text-center text-sm text-[#8b8b8b]">
          データがありません
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium w-10"></th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">シャフト名</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">メーカー</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">種類</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">フレックス</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">件数</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.name} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] cursor-pointer">
                  <td className="px-3 py-2">
                    <div className="w-8 h-8 rounded border border-[#e5e5e5] bg-[#f5f5f5] overflow-hidden">
                      {g.image_url ? (
                        <img src={g.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center h-full text-[8px] text-[#ccc]">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/catalog/shafts/${encodeURIComponent(g.name)}`} className="font-medium text-[#006728] hover:underline">
                      {g.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-[#555]">{g.maker ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-[#555]">{g.shaft_type ?? "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {g.flexes.map((f) => (
                        <span key={f} className="inline-block rounded bg-[#f0f0f0] px-1.5 py-0.5 text-[10px] text-[#555]">{f}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-[#888]">{g.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ShaftsPage() {
  return <Suspense><ShaftList /></Suspense>;
}
