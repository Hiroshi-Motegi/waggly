"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Plus } from "lucide-react";
import type { Accessory, AccessoryCategory, AccessoryStatus } from "@/types/database";

const categoryLabels: Record<AccessoryCategory, string> = {
  ball: "ボール",
  glove: "グローブ",
  tee: "ティー",
  other: "その他",
};

const categoryIcons: Record<AccessoryCategory, string> = {
  ball: "/icons/cat-ball.svg",
  glove: "/icons/cat-glove.svg",
  tee: "/icons/cat-tee.svg",
  other: "/icons/cat-other.svg",
};

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-xs ${i <= rating ? "text-amber-400" : "text-gray-300"}`}>
          ★
        </span>
      ))}
    </div>
  );
}

type FilterTab = "all" | AccessoryStatus;

const filterTabs: { value: FilterTab; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "active", label: "使用中" },
  { value: "past", label: "アーカイブ" },
];

export default function ItemsPage() {
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const url = filter === "all" ? "/api/accessories" : `/api/accessories?status=${filter}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        setAccessories(await res.json());
      } catch {
        setAccessories([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [filter]);

  return (
    <div className="flex flex-col px-2 py-2 space-y-2">
      <PageHeader title="アイテム" showBack={false}>
        <Link href="/items/new">
          <button className="flex items-center gap-1 rounded-full bg-[#006728] px-4 py-1.5 text-xs font-bold text-white">
            <Plus className="h-4 w-4" />
            追加
          </button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
        {/* Tabs */}
        <div className="flex items-end gap-0.5">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className="flex flex-col items-center gap-0.5 pt-1"
            >
              <span
                className={`px-2 py-0.5 text-sm font-bold text-[#006728]`}
              >
                {tab.label}
              </span>
              <div
                className={`h-0.5 w-full ${
                  filter === tab.value ? "bg-[#006728]" : "bg-[#a5cbb4]"
                }`}
              />
            </button>
          ))}
          <div className="h-0.5 flex-1 bg-[#ececec]" />
        </div>

        {/* List */}
        {isLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">読み込み中...</p>
        ) : accessories.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            アイテムが登録されていません
          </p>
        ) : (
          <div className="flex flex-col">
            {accessories.map((item, i) => (
              <Link key={item.id} href={`/items/${item.id}`}>
                <div
                  className={`flex items-center gap-2.5 py-2 ${
                    i < accessories.length - 1 ? "border-b border-[#dfdfdf]" : ""
                  }`}
                >
                  <div className="size-[50px] shrink-0 overflow-hidden rounded bg-[#f0f0f0] flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.model ?? ""} className="size-full object-cover" />
                    ) : (
                      <Image src={categoryIcons[item.category]} alt="" width={30} height={30} className="opacity-50" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-px min-w-0">
                    <span className="text-xs font-medium text-[#8b8b8b]">
                      {categoryLabels[item.category]}
                    </span>
                    <span className="text-sm font-bold text-black truncate">
                      {[item.brand, item.model].filter(Boolean).join(" ") || "—"}
                    </span>
                    <StarRating rating={item.rating} />
                  </div>
                  {item.status === "past" && (
                    <span className="shrink-0 rounded-full bg-[#c7e2ca] px-1.5 py-0.5 text-[10px] font-medium text-black">
                      アーカイブ
                    </span>
                  )}
                  <Image
                    src="/icons/chevron-right.svg"
                    alt=""
                    width={6}
                    height={10}
                    className="shrink-0 opacity-60"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
