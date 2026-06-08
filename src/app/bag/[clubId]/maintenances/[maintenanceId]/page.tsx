"use client";

import { Loading } from "@/components/loading";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClub } from "@/hooks/use-clubs";
import type { Maintenance } from "@/types/database";

const maintenanceTypeLabels: Record<string, string> = {
  grip_change: "グリップ交換",
  reshaft: "リシャフト",
  loft_adjust: "ロフト調整",
  other: "その他",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ clubId: string; maintenanceId: string }>;
}) {
  const { clubId, maintenanceId } = use(params);
  const { club } = useClub(clubId);
  const router = useRouter();
  const [item, setItem] = useState<Maintenance | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetch(`/api/clubs/${clubId}/maintenances/${maintenanceId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setIsFetching(false));
  }, [clubId, maintenanceId]);

  async function handleDelete() {
    if (!confirm("このメンテナンス記録を削除しますか？")) return;
    const res = await fetch(`/api/clubs/${clubId}/maintenances/${maintenanceId}`, { method: "DELETE" });
    if (res.ok) router.push(`/bag/${clubId}/maintenances`);
  }

  if (isFetching) return <Loading />;
  if (!item) return <p className="p-4 text-center text-muted-foreground">記録が見つかりません</p>;

  return (
    <div className="flex flex-col px-2 py-2 space-y-2">
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-xs font-bold text-[#1e944c]">{club?.club_number}</span>
          <h2 className="text-lg font-bold text-[#006728]">メンテナンス</h2>
        </div>
        <Link href={`/bag/${clubId}/maintenances/${maintenanceId}/edit`}>
          <Button size="sm" variant="outline" className="gap-1 border-[#006728] text-[#006728]">
            <Pencil className="h-4 w-4" />
            編集
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-[#c7e2ca] px-2.5 py-0.5 text-xs font-medium text-black">
            {maintenanceTypeLabels[item.type]}
          </span>
          <span className="text-sm text-[#8b8b8b]">{formatDate(item.done_at)}</span>
        </div>

        {item.description && (
          <div className="border-t border-[#dfdfdf] pt-3">
            <p className="text-xs font-medium text-[#8b8b8b] mb-1">メモ</p>
            <p className="text-sm whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        <div className="border-t border-[#dfdfdf] pt-3 flex flex-col gap-1">
          {item.shop && (
            <div className="flex justify-between text-sm">
              <span className="text-[#8b8b8b]">実施店舗</span>
              <span>{item.shop}</span>
            </div>
          )}
          {item.cost != null && (
            <div className="flex justify-between text-sm">
              <span className="text-[#8b8b8b]">費用</span>
              <span className="font-medium">{item.cost.toLocaleString()}円</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={handleDelete} className="text-sm font-bold text-red-500">
          この記録を削除
        </button>
      </div>
    </div>
  );
}
