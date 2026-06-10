"use client";

import { Loading } from "@/components/loading";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useClub } from "@/hooks/use-clubs";
import type { Maintenance } from "@/types/database";
import { nativeHref } from "@/lib/native-routes";

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
    apiFetch(`/api/clubs/${clubId}/maintenances/${maintenanceId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setIsFetching(false));
  }, [clubId, maintenanceId]);

  async function handleDelete() {
    if (!confirm("このメンテナンス記録を削除しますか？")) return;
    const res = await apiFetch(`/api/clubs/${clubId}/maintenances/${maintenanceId}`, { method: "DELETE" });
    if (res.ok) router.push(nativeHref(`/bag/${clubId}/maintenances`));
  }

  if (isFetching) return <Loading variant="light" />;
  if (!item) return <p className="p-4 text-center text-muted-foreground">記録が見つかりません</p>;

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-sm font-bold text-white">{club?.club_number}</span>
          <h2 className="text-lg font-bold text-white">メンテナンス</h2>
        </div>
        <Link href={nativeHref(`/bag/${clubId}/maintenances/${maintenanceId}/edit`)}>
          <Button size="sm" variant="outline" className="gap-1 border-white text-white bg-transparent">
            <Pencil className="h-4 w-4" />
            編集
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-[#c7e2ca] px-2.5 py-1 text-xs font-bold text-black">
            {maintenanceTypeLabels[item.type]}
          </span>
          <span className="text-base text-[#8b8b8b]">{formatDate(item.done_at)}</span>
        </div>

        {item.description && (
          <div className="border-t border-[#dfdfdf] pt-3">
            <p className="text-sm font-medium text-[#8b8b8b] mb-1">メモ</p>
            <p className="text-base whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        <div className="border-t border-[#dfdfdf] pt-3 flex flex-col gap-1">
          {item.shop && (
            <div className="flex justify-between text-base">
              <span className="text-[#8b8b8b]">実施店舗</span>
              <span>{item.shop}</span>
            </div>
          )}
          {item.cost != null && (
            <div className="flex justify-between text-base">
              <span className="text-[#8b8b8b]">費用</span>
              <span className="font-medium">{item.cost.toLocaleString()}円</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={handleDelete} className="text-base font-bold text-white">
          この記録を削除
        </button>
      </div>
      </div>
    </div>
  );
}
