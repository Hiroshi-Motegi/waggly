"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Circle, Hand, Triangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Accessory, AccessoryCategory, AccessoryStatus } from "@/types/database";

const categoryLabels: Record<AccessoryCategory, string> = {
  ball: "ボール",
  glove: "グローブ",
  tee: "ティー",
  other: "その他",
};

function CategoryIcon({ category }: { category: AccessoryCategory }) {
  switch (category) {
    case "ball":
      return <Circle className="h-5 w-5" />;
    case "glove":
      return <Hand className="h-5 w-5" />;
    case "tee":
      return <Triangle className="h-5 w-5" />;
    default:
      return <Package className="h-5 w-5" />;
  }
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <span className="text-xs text-amber-500">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

type FilterTab = "all" | AccessoryStatus;

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
        const data = await res.json();
        setAccessories(data);
      } catch {
        setAccessories([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [filter]);

  const filterTabs: { value: FilterTab; label: string }[] = [
    { value: "all", label: "すべて" },
    { value: "active", label: "使用中" },
    { value: "past", label: "過去" },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">アイテム</h2>
        <Link href="/items/new">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            追加
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground">読み込み中...</p>
      ) : accessories.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          アイテムが登録されていません
        </p>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          {accessories.map((item, index) => (
            <div key={item.id}>
              <Link href={`/items/${item.id}`}>
                <div className="flex items-center gap-3 px-3 py-3 hover:bg-muted/50 transition-colors">
                  <div className="text-muted-foreground shrink-0">
                    <CategoryIcon category={item.category} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {categoryLabels[item.category]}
                      </span>
                      {item.status === "past" && (
                        <span className="text-[10px] px-1.5 py-0 rounded border text-muted-foreground">
                          過去
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-tight truncate">
                      {[item.brand, item.model].filter(Boolean).join(" ") || "—"}
                    </p>
                    {item.rating != null && (
                      <StarRating rating={item.rating} />
                    )}
                    {item.memo && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.memo}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
              {index < accessories.length - 1 && (
                <div className="border-t mx-3" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
