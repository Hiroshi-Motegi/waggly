"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { type SortingState, type ColumnDef } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { useAdminList } from "@/hooks/admin/use-admin-list";

/* ── Types ── */

interface ClubSpec {
  id: string;
  maker: string;
  model: string;
  category: string;
  club_number: string | null;
  loft: number | null;
  lie: number | null;
  length: number | null;
  distance: number | null;
  weight: number | null;
  swing_weight: string | null;
  head_volume: number | null;
  head_weight: number | null;
  image_url: string | null;
  affiliate_url: string | null;
  source: string;
  verified: boolean;
  series_id: string | null;
  series: { id: string; image_url: string | null; affiliate_url: string | null } | null;
}

/* ── Constants ── */

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

const noImage: Record<string, string> = {
  driver: "/no-images/driver.png",
  fairway_wood: "/no-images/fw.png",
  utility: "/no-images/ut.png",
  iron: "/no-images/Iron.png",
  wedge: "/no-images/wedge.png",
  putter: "/no-images/putter.png",
};

/* ── Columns ── */

const columns: ColumnDef<ClubSpec, any>[] = [
  {
    id: "thumbnail",
    header: "",
    enableSorting: false,
    cell: ({ row }) => {
      const spec = row.original;
      const src =
        spec.series?.image_url ?? spec.image_url ?? noImage[spec.category] ?? "/no-images/etc.png";
      return (
        <img
          src={src}
          alt={spec.model}
          className="h-10 w-10 rounded object-contain bg-[#f5f5f5]"
        />
      );
    },
  },
  {
    accessorKey: "maker",
    header: "メーカー",
    enableSorting: true,
  },
  {
    accessorKey: "model",
    header: "モデル",
    enableSorting: true,
  },
  {
    accessorKey: "category",
    header: "カテゴリ",
    enableSorting: false,
    cell: ({ getValue }) => CATEGORY_LABELS[getValue() as string] ?? getValue(),
  },
  {
    accessorKey: "club_number",
    header: "番手",
    enableSorting: false,
  },
  {
    accessorKey: "loft",
    header: "ロフト",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return v != null ? `${v}°` : "-";
    },
  },
  {
    accessorKey: "lie",
    header: "ライ角",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return v != null ? `${v}°` : "-";
    },
  },
  {
    accessorKey: "length",
    header: "長さ",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return v != null ? `${v}inch` : "-";
    },
  },
  {
    id: "verified",
    header: "状態",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.verified ? (
        <span className="inline-block rounded-full bg-[#006728] px-2 py-0.5 text-[11px] font-bold text-white">
          確認済
        </span>
      ) : (
        <span className="text-[11px] text-[#8b8b8b]">未確認</span>
      ),
  },
  {
    id: "actions",
    header: "操作",
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        href={`/admin/specs/${row.original.id}`}
        className="text-xs font-bold text-[#006728] hover:underline"
      >
        編集
      </Link>
    ),
  },
];

/* ── Inner (uses useSearchParams → must be inside Suspense) ── */

function SpecsList() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";

  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);

  const sort = sorting[0]?.id ?? "";
  const order = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : "";

  const { data, isLoading } = useAdminList<ClubSpec>("specs", {
    page,
    pageSize: 20,
    ...(sort ? { sort, order } : {}),
    ...(category ? { category } : {}),
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          クラブスペック一覧
          {data && (
            <span className="ml-2 text-base font-normal text-[#888]">
              ({data.total}件)
            </span>
          )}
        </h1>
      </div>

      {isLoading ? (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-[#8b8b8b]">
          読み込み中...
        </div>
      ) : (
        <AdminTable<ClubSpec>
          data={data?.data ?? []}
          columns={columns}
          total={data?.total ?? 0}
          page={page}
          pageSize={20}
          sorting={sorting}
          onSortingChange={setSorting}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

/* ── Page ── */

export default function AdminSpecsPage() {
  return (
    <Suspense>
      <SpecsList />
    </Suspense>
  );
}
