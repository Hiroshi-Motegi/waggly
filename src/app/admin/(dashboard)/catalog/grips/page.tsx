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
          グリップ管理 <span className="text-base font-normal text-[#888]">({grips.length}件)</span>
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

      {grips.length === 0 ? (
        <div className="rounded-lg bg-white border border-[#e5e5e5] p-8 text-center text-sm text-[#8b8b8b]">
          データがありません
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium w-10"></th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">グリップ名</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">メーカー</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">サイズ</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">重量(g)</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">素材</th>
                <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">公開</th>
              </tr>
            </thead>
            <tbody>
              {grips.map((g) => (
                <tr key={g.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
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
                    <Link href={`/admin/catalog/grips/${encodeURIComponent(g.id)}`} className="font-medium text-[#006728] hover:underline">
                      {g.grip_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-[#555]">{g.maker ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-[#555]">{g.grip_size ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-[#555]">{g.weight ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-[#555]">{g.material ?? "-"}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[11px] font-bold ${g.is_visible ? "text-[#006728]" : "text-[#999]"}`}>
                      {g.is_visible ? "公開" : "非公開"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function GripsPage() {
  return <Suspense><GripList /></Suspense>;
}
