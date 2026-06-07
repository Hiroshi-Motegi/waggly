"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    onSubmit(form);
  }

  function update(field: string, value: string | number | undefined | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="category">種別</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger id="category" aria-label="種別">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
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
          <div>
            <Label htmlFor="maker">メーカー</Label>
            <Input
              id="maker"
              aria-label="メーカー"
              value={form.maker ?? ""}
              onChange={(e) => update("maker", e.target.value)}
              placeholder="例: Titleist"
            />
          </div>
          <div>
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

      {/* Shaft */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">シャフト</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="shaft_name">シャフト名</Label>
            <Input
              id="shaft_name"
              value={form.shaft_name ?? ""}
              onChange={(e) => update("shaft_name", e.target.value)}
              placeholder="例: Speeder NX"
            />
          </div>
          <div>
            <Label htmlFor="shaft_flex">フレックス</Label>
            <Select value={form.shaft_flex ?? ""} onValueChange={(v) => update("shaft_flex", v)}>
              <SelectTrigger id="shaft_flex">
                <SelectValue placeholder="選択" />
              </SelectTrigger>
              <SelectContent>
                {["X", "S", "SR", "R", "R2", "L"].map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Specs */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">スペック</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
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
          <div>
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
          <div>
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
        <div>
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
        <div>
          <Label htmlFor="purchase_date">購入日</Label>
          <Input
            id="purchase_date"
            type="date"
            value={form.purchase_date ?? ""}
            onChange={(e) => update("purchase_date", e.target.value || undefined)}
          />
        </div>
        <div>
          <Label htmlFor="purchase_shop">購入店</Label>
          <Input
            id="purchase_shop"
            value={form.purchase_shop ?? ""}
            onChange={(e) => update("purchase_shop", e.target.value)}
            placeholder="例: ゴルフ5 新宿店"
          />
        </div>
        <div>
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
