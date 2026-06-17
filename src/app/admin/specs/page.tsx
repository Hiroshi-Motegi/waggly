"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { createContext, useContext, Suspense, useState, useCallback } from "react";
import Link from "next/link";
import { type SortingState, type ColumnDef } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { useAdminList } from "@/hooks/admin/use-admin-list";
import { apiFetch } from "@/lib/api-client";

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
  total_weight: number | null;
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

/* ── Inline edit cell (local state, commit on blur) ── */

function EditableNumCell({
  initialValue,
  suffix,
  onCommit,
}: {
  initialValue: string;
  suffix?: string;
  onCommit: (v: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <div className="flex items-center gap-0.5">
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => { if (value !== initialValue) onCommit(value); }}
        onClick={(e) => e.stopPropagation()}
        className="w-16 rounded border border-[#dfdfdf] bg-white px-1.5 py-0.5 text-sm outline-none focus:border-[#006728]"
        placeholder="-"
      />
      {suffix && <span className="text-[10px] text-[#888]">{suffix}</span>}
    </div>
  );
}

function EditableTextCell({
  initialValue,
  onCommit,
}: {
  initialValue: string;
  onCommit: (v: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { if (value !== initialValue) onCommit(value); }}
      onClick={(e) => e.stopPropagation()}
      className="w-14 rounded border border-[#dfdfdf] bg-white px-1.5 py-0.5 text-sm outline-none focus:border-[#006728]"
      placeholder="-"
    />
  );
}

/* ── View-mode columns ── */

function getViewColumns(router: ReturnType<typeof useRouter>): ColumnDef<ClubSpec, any>[] {
  return [
    {
      id: "thumbnail",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const spec = row.original;
        const src = spec.series?.image_url ?? spec.image_url ?? noImage[spec.category] ?? "/no-images/etc.png";
        return <img src={src} alt={spec.model} className="h-10 w-10 rounded object-contain bg-[#f5f5f5]" />;
      },
    },
    { accessorKey: "maker", header: "メーカー", enableSorting: true },
    { accessorKey: "model", header: "モデル", enableSorting: true },
    {
      accessorKey: "category", header: "カテゴリ", enableSorting: false,
      cell: ({ getValue }) => CATEGORY_LABELS[getValue() as string] ?? getValue(),
    },
    { accessorKey: "club_number", header: "番手", enableSorting: false },
    {
      accessorKey: "loft", header: "ロフト", enableSorting: false,
      cell: ({ getValue }) => { const v = getValue() as number | null; return v != null ? `${v}°` : "-"; },
    },
    {
      accessorKey: "lie", header: "ライ角", enableSorting: false,
      cell: ({ getValue }) => { const v = getValue() as number | null; return v != null ? `${v}°` : "-"; },
    },
    {
      accessorKey: "length", header: "長さ", enableSorting: false,
      cell: ({ getValue }) => { const v = getValue() as number | null; return v != null ? `${v}"` : "-"; },
    },
    {
      accessorKey: "total_weight", header: "重量", enableSorting: false,
      cell: ({ getValue }) => { const v = getValue() as number | null; return v != null ? `${v}g` : "-"; },
    },
    {
      accessorKey: "swing_weight", header: "バランス", enableSorting: false,
      cell: ({ getValue }) => (getValue() as string | null) ?? "-",
    },
    {
      accessorKey: "head_volume", header: "体積", enableSorting: false,
      cell: ({ getValue }) => { const v = getValue() as number | null; return v != null ? `${v}cc` : "-"; },
    },
    {
      accessorKey: "head_weight", header: "ヘッド重量", enableSorting: false,
      cell: ({ getValue }) => { const v = getValue() as number | null; return v != null ? `${v}g` : "-"; },
    },
    {
      accessorKey: "distance", header: "飛距離", enableSorting: false,
      cell: ({ getValue }) => { const v = getValue() as number | null; return v != null ? `${v}yd` : "-"; },
    },
    {
      id: "verified", header: "状態", enableSorting: false,
      cell: ({ row }) =>
        row.original.verified
          ? <span className="inline-block rounded-full bg-[#006728] px-2 py-0.5 text-[11px] font-bold text-white">確認済</span>
          : <span className="text-[11px] text-[#8b8b8b]">未確認</span>,
    },
    {
      id: "actions", header: "", enableSorting: false,
      cell: ({ row }) => (
        <Link href={`/admin/specs/${row.original.id}`} className="text-xs font-bold text-[#006728] hover:underline"
          onClick={(e) => e.stopPropagation()}>
          編集
        </Link>
      ),
    },
  ];
}

/* ── Edit-mode context + columns ── */

type Edits = Record<string, Record<string, any>>;
type SetEdits = React.Dispatch<React.SetStateAction<Edits>>;

const EditsContext = createContext<{ edits: Edits; setEdits: SetEdits }>({ edits: {}, setEdits: () => {} });

function EditNumField({ spec, field, suffix }: { spec: ClubSpec; field: string; suffix?: string }) {
  const { setEdits } = useContext(EditsContext);
  const initial = (spec as any)[field];
  return (
    <EditableNumCell
      initialValue={initial != null ? String(initial) : ""}
      suffix={suffix}
      onCommit={(v) => setEdits((prev) => ({ ...prev, [spec.id]: { ...prev[spec.id], [field]: v } }))}
    />
  );
}

function EditTextField({ spec, field }: { spec: ClubSpec; field: string }) {
  const { setEdits } = useContext(EditsContext);
  const initial = (spec as any)[field];
  return (
    <EditableTextCell
      initialValue={initial ?? ""}
      onCommit={(v) => setEdits((prev) => ({ ...prev, [spec.id]: { ...prev[spec.id], [field]: v } }))}
    />
  );
}

function EditVerifiedField({ spec }: { spec: ClubSpec }) {
  const { edits, setEdits } = useContext(EditsContext);
  const checked = edits[spec.id]?.verified !== undefined ? edits[spec.id].verified : spec.verified;
  return (
    <label className="flex items-center gap-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={checked}
        onChange={() => setEdits((prev) => ({ ...prev, [spec.id]: { ...prev[spec.id], verified: !checked } }))}
        className="rounded accent-[#006728]" />
      <span className={`text-[11px] font-bold ${checked ? "text-[#006728]" : "text-[#8b8b8b]"}`}>
        {checked ? "確認済" : "未確認"}
      </span>
    </label>
  );
}

function EditChangedBadge({ spec }: { spec: ClubSpec }) {
  const { edits } = useContext(EditsContext);
  const hasChanges = !!edits[spec.id] && Object.keys(edits[spec.id]).length > 0;
  return hasChanges ? <span className="text-[10px] text-amber-600 font-bold">変更あり</span> : null;
}

const editColumns: ColumnDef<ClubSpec, any>[] = [
  {
    id: "thumbnail", header: "", enableSorting: false,
    cell: ({ row }) => {
      const spec = row.original;
      const src = spec.series?.image_url ?? spec.image_url ?? noImage[spec.category] ?? "/no-images/etc.png";
      return <img src={src} alt={spec.model} className="h-10 w-10 rounded object-contain bg-[#f5f5f5]" />;
    },
  },
  { accessorKey: "maker", header: "メーカー", enableSorting: false },
  { accessorKey: "model", header: "モデル", enableSorting: false },
  {
    accessorKey: "category", header: "カテゴリ", enableSorting: false,
    cell: ({ getValue }) => CATEGORY_LABELS[getValue() as string] ?? getValue(),
  },
  { accessorKey: "club_number", header: "番手", enableSorting: false },
  { id: "loft_edit", header: "ロフト", enableSorting: false, cell: ({ row }) => <EditNumField spec={row.original} field="loft" suffix="°" /> },
  { id: "lie_edit", header: "ライ角", enableSorting: false, cell: ({ row }) => <EditNumField spec={row.original} field="lie" suffix="°" /> },
  { id: "length_edit", header: "長さ", enableSorting: false, cell: ({ row }) => <EditNumField spec={row.original} field="length" suffix='"' /> },
  { id: "total_weight_edit", header: "重量", enableSorting: false, cell: ({ row }) => <EditNumField spec={row.original} field="total_weight" suffix="g" /> },
  { id: "swing_weight_edit", header: "バランス", enableSorting: false, cell: ({ row }) => <EditTextField spec={row.original} field="swing_weight" /> },
  { id: "head_volume_edit", header: "体積", enableSorting: false, cell: ({ row }) => <EditNumField spec={row.original} field="head_volume" suffix="cc" /> },
  { id: "head_weight_edit", header: "ヘッド重量", enableSorting: false, cell: ({ row }) => <EditNumField spec={row.original} field="head_weight" suffix="g" /> },
  { id: "distance_edit", header: "飛距離", enableSorting: false, cell: ({ row }) => <EditNumField spec={row.original} field="distance" suffix="yd" /> },
  { id: "verified_edit", header: "状態", enableSorting: false, cell: ({ row }) => <EditVerifiedField spec={row.original} /> },
  { id: "changed", header: "", enableSorting: false, cell: ({ row }) => <EditChangedBadge spec={row.original} /> },
];

/* ── Inner (uses useSearchParams → must be inside Suspense) ── */

function SpecsList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = searchParams.get("category") ?? "";

  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Edits>({});
  const [saving, setSaving] = useState(false);

  const sort = sorting[0]?.id ?? "";
  const order = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : "";

  const { data, isLoading, mutate } = useAdminList<ClubSpec>("specs", {
    page,
    pageSize: 20,
    ...(sort ? { sort, order } : {}),
    ...(category ? { category } : {}),
  });

  const viewColumns = getViewColumns(router);

  const changedCount = Object.keys(edits).filter((id) => Object.keys(edits[id]).length > 0).length;

  function parseNum(v: string): number | null {
    if (v === "" || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  async function handleBulkSave() {
    const changedIds = Object.keys(edits).filter((id) => Object.keys(edits[id]).length > 0);
    if (changedIds.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        changedIds.map((id) => {
          const changes = edits[id];
          const payload: Record<string, any> = {};
          if ("loft" in changes) payload.loft = parseNum(changes.loft);
          if ("lie" in changes) payload.lie = parseNum(changes.lie);
          if ("length" in changes) payload.length = parseNum(changes.length);
          if ("total_weight" in changes) payload.total_weight = parseNum(changes.total_weight);
          if ("swing_weight" in changes) payload.swing_weight = changes.swing_weight || null;
          if ("head_volume" in changes) payload.head_volume = parseNum(changes.head_volume);
          if ("head_weight" in changes) payload.head_weight = parseNum(changes.head_weight);
          if ("distance" in changes) payload.distance = parseNum(changes.distance);
          if ("verified" in changes) payload.verified = changes.verified;
          return apiFetch("/api/admin/specs", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, action: "update", data: payload }),
          });
        }),
      );
      setEdits({});
      await mutate();
    } finally {
      setSaving(false);
    }
  }

  function handleToggleEditMode() {
    if (editMode) {
      setEdits({});
    }
    setEditMode(!editMode);
  }

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
        <div className="flex items-center gap-2">
          {editMode && changedCount > 0 && (
            <button onClick={handleBulkSave} disabled={saving}
              className="rounded-full bg-[#006728] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40">
              {saving ? "保存中..." : `${changedCount}件を保存`}
            </button>
          )}
          <button onClick={handleToggleEditMode}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              editMode
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : "border border-[#dfdfdf] text-[#333] hover:bg-[#f5f5f5]"
            }`}>
            {editMode ? "編集モード終了" : "一括編集"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-[#8b8b8b]">
          読み込み中...
        </div>
      ) : editMode ? (
        <EditsContext.Provider value={{ edits, setEdits }}>
          <AdminTable<ClubSpec>
            data={data?.data ?? []}
            columns={editColumns}
            total={data?.total ?? 0}
            page={page}
            pageSize={20}
            sorting={sorting}
            onSortingChange={setSorting}
            onPageChange={setPage}
          />
        </EditsContext.Provider>
      ) : (
        <AdminTable<ClubSpec>
          data={data?.data ?? []}
          columns={viewColumns}
          total={data?.total ?? 0}
          page={page}
          pageSize={20}
          sorting={sorting}
          onSortingChange={setSorting}
          onPageChange={setPage}
          onRowClick={(row) => router.push(`/admin/specs/${row.id}`)}
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
