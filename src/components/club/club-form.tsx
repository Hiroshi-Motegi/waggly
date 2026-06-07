"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Club, ClubCategory } from "@/types/database";

const categories: { value: ClubCategory; label: string }[] = [
  { value: "driver", label: "ドライバー" },
  { value: "fairway_wood", label: "フェアウェイウッド" },
  { value: "utility", label: "ユーティリティ" },
  { value: "iron", label: "アイアン" },
  { value: "wedge", label: "ウェッジ" },
  { value: "putter", label: "パター" },
];

interface ClubFormProps {
  initialData?: Partial<Club>;
  onSubmit: (data: Partial<Club>) => void;
  isSubmitting?: boolean;
}

export function ClubForm({ initialData, onSubmit, isSubmitting }: ClubFormProps) {
  const [form, setForm] = useState<Partial<Club>>({
    category: undefined,
    club_number: "",
    maker: "",
    model: "",
    shaft_name: "",
    shaft_flex: "",
    loft: undefined,
    lie: undefined,
    length: undefined,
    distance: undefined,
    purchase_date: undefined,
    purchase_shop: "",
    purchase_price: undefined,
    ...initialData,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category || !form.club_number) return;
    // Clean empty strings to null for nullable DB fields
    const cleaned = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
    );
    onSubmit(cleaned);
  }

  const steelFlexes = ["X100", "S400", "S300", "S200", "R400", "R300", "R200"];
  const [shaftType, setShaftType] = useState<"carbon" | "steel">(
    initialData?.shaft_flex && steelFlexes.includes(initialData.shaft_flex) ? "steel" : "carbon"
  );
  const [isSearching, setIsSearching] = useState(false);

  function update(field: string, value: string | number | undefined | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAutofill() {
    setIsSearching(true);
    try {
      const res = await fetch("/api/clubs/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          club_number: form.club_number,
          maker: form.maker,
          model: form.model,
          shaft_name: form.shaft_name,
          shaft_flex: form.shaft_flex,
        }),
      });
      if (!res.ok) throw new Error("検索に失敗しました");
      const specs = await res.json();
      // Only fill in fields that are currently empty
      setForm((prev) => ({
        ...prev,
        loft: prev.loft ?? specs.loft ?? prev.loft,
        lie: prev.lie ?? specs.lie ?? prev.lie,
        length: prev.length ?? specs.length ?? prev.length,
        distance: prev.distance ?? specs.distance ?? prev.distance,
      }));
    } catch (error) {
      console.error("Autofill failed:", error);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 pb-8 overflow-x-hidden">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category">種別</Label>
          <select
            id="category"
            aria-label="種別"
            value={form.category ?? ""}
            onChange={(e) => update("category", e.target.value || undefined)}
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">選択してください</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="club_number">番手</Label>
          <Input
            id="club_number"
            aria-label="番手"
            value={form.club_number ?? ""}
            onChange={(e) => update("club_number", e.target.value)}
            placeholder="例: 1W, 7I, PW"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maker">メーカー</Label>
            <Input
              id="maker"
              aria-label="メーカー"
              value={form.maker ?? ""}
              onChange={(e) => update("maker", e.target.value)}
              placeholder="例: Titleist"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">モデル</Label>
            <Input
              id="model"
              value={form.model ?? ""}
              onChange={(e) => update("model", e.target.value)}
              placeholder="例: TSR3"
            />
          </div>
        </div>
      </div>

      {/* Shaft (hidden for putter) */}
      {form.category !== "putter" && <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">シャフト</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="shaft_name">シャフト名</Label>
            <Input
              id="shaft_name"
              value={form.shaft_name ?? ""}
              onChange={(e) => update("shaft_name", e.target.value)}
              placeholder="例: Speeder NX"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shaft_type">素材</Label>
            <select
              id="shaft_type"
              value={shaftType}
              onChange={(e) => {
                setShaftType(e.target.value as "carbon" | "steel");
                update("shaft_flex", undefined);
              }}
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="carbon">カーボン</option>
              <option value="steel">スチール</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shaft_flex">フレックス</Label>
          <select
            id="shaft_flex"
            value={form.shaft_flex ?? ""}
            onChange={(e) => update("shaft_flex", e.target.value || undefined)}
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">選択</option>
            {shaftType === "carbon"
              ? ["X", "S", "SR", "R", "R2", "L"].map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))
              : ["X100", "S400", "S300", "S200", "R400", "R300", "R200"].map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))
            }
          </select>
        </div>
      </div>}

      {/* Auto-fill */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isSearching || (!form.maker && !form.model)}
          onClick={handleAutofill}
        >
          {isSearching ? "検索中..." : "自動検索"}
        </Button>
        <p className="text-xs text-muted-foreground">
          ※クラブ情報はウェブサイトなどの公開情報から情報を収集します。自動入力された内容は誤りがある場合があります。
        </p>
      </div>

      {/* Specs */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">スペック</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="loft">ロフト角</Label>
            <Input
              id="loft"
              type="number"
              step="0.5"
              value={form.loft ?? ""}
              onChange={(e) => update("loft", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="10.5"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lie">ライ角</Label>
            <Input
              id="lie"
              type="number"
              step="0.5"
              value={form.lie ?? ""}
              onChange={(e) => update("lie", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="56"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="length">長さ(inch)</Label>
            <Input
              id="length"
              type="number"
              step="0.25"
              value={form.length ?? ""}
              onChange={(e) => update("length", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="45.5"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="distance">飛距離 (yd)</Label>
          <Input
            id="distance"
            type="number"
            value={form.distance ?? ""}
            onChange={(e) => update("distance", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="230"
          />
        </div>
      </div>

      {/* Purchase */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">購入情報</h3>
        <div className="space-y-2">
          <Label htmlFor="purchase_date">購入日</Label>
          <Input
            id="purchase_date"
            type="date"
            value={form.purchase_date ?? ""}
            onChange={(e) => update("purchase_date", e.target.value || undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchase_shop">購入店</Label>
          <Input
            id="purchase_shop"
            value={form.purchase_shop ?? ""}
            onChange={(e) => update("purchase_shop", e.target.value)}
            placeholder="例: ゴルフ5 新宿店"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchase_price">価格 (円)</Label>
          <Input
            id="purchase_price"
            type="number"
            value={form.purchase_price ?? ""}
            onChange={(e) => update("purchase_price", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="50000"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "保存中..." : "保存"}
      </Button>
    </form>
  );
}
