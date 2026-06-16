"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
// import { apiFetch } from "@/lib/api-client"; // TODO: AI自動入力復活時に戻す
// import { useAuth } from "@/hooks/use-auth"; // TODO: AI自動入力復活時に戻す
import type { Club, ClubCategory } from "@/types/database";
import { useFormValidation } from "@/hooks/use-form-validation";
import { clubValidationSchema } from "@/lib/form-validation";
import { FieldError } from "@/components/ui/field-error";
import { ImagePicker } from "@/components/ui/image-picker";

const categories: { value: ClubCategory; label: string }[] = [
  { value: "driver", label: "ドライバー" },
  { value: "fairway_wood", label: "フェアウェイウッド" },
  { value: "utility", label: "ユーティリティ" },
  { value: "iron", label: "アイアン" },
  { value: "wedge", label: "ウェッジ" },
  { value: "putter", label: "パター" },
];

const clubNumbersByCategory: Record<string, string[]> = {
  driver: [],
  fairway_wood: ["2W", "3W", "4W", "5W", "6W", "7W", "8W", "9W"],
  utility: ["2U", "3U", "4U", "5U", "6U", "7U"],
  iron: ["3I", "4I", "5I", "6I", "7I", "8I", "9I"],
  wedge: ["PW", "AW", "SW", "LW"],
  putter: [],
};

interface ClubFormProps {
  initialData?: Partial<Club>;
  onSubmit: (data: Partial<Club>, pendingImage?: File) => void;
  isSubmitting?: boolean;
  showImagePicker?: boolean;
  onCancel?: () => void;
  extraContent?: React.ReactNode;
}

function SectionAccordion({ id, title, isOpen, onToggle, sectionRef, children }: {
  id: string; title: string; isOpen: boolean; onToggle: (id: string) => void;
  sectionRef: (el: HTMLDivElement | null) => void; children: React.ReactNode;
}) {
  return (
    <div ref={sectionRef} className="rounded-lg bg-white overflow-hidden scroll-mt-[60px]">
      <button type="button" onClick={() => onToggle(id)} className="flex w-full items-center px-3 py-3">
        <span className="flex-1 text-left text-base font-bold">{title}</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
      </button>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";
const selectClass = inputClass;
const labelClass = "text-sm flex items-center";

export function ClubForm({ initialData, onSubmit, isSubmitting, showImagePicker, onCancel, extraContent }: ClubFormProps) {
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
    release_year: undefined,
    memo: "",
    purchase_date: undefined,
    purchase_shop: "",
    purchase_price: undefined,
    weight: undefined,
    swing_weight: "",
    frequency: undefined,
    kick_point: "",
    head_volume: undefined,
    head_weight: undefined,
    rating: null,
    ...initialData,
  });
  const { validateOnChange, validateOnSubmit, fieldError } = useFormValidation(clubValidationSchema);
  // const { user } = useAuth(); // TODO: AI自動入力復活時に戻す
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const [useCustomNumber, setUseCustomNumber] = useState(() => {
    if (!initialData?.club_number || !initialData?.category) return false;
    const presets = clubNumbersByCategory[initialData.category] ?? [];
    return !presets.includes(initialData.club_number);
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateOnSubmit(form as any)) return;
    const cleaned = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
    );
    onSubmit(cleaned, pendingFile ?? undefined);
  }

  function removeImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
  }

  const steelFlexes = ["X100", "S400", "S300", "S200", "R400", "R300", "R200"];
  const [shaftType, setShaftType] = useState<"carbon" | "steel">(
    initialData?.shaft_flex && steelFlexes.includes(initialData.shaft_flex) ? "steel" : "carbon"
  );
  function update(field: string, value: string | number | undefined | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
    validateOnChange(field, value);
  }

  /* TODO: AI自動入力復活時に戻す
  const [isSearching, setIsSearching] = useState(false);

  async function handleAutofill() {
    setIsSearching(true);
    try {
      const res = await apiFetch("/api/clubs/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          club_number: form.club_number,
          maker: form.maker,
          model: form.model,
          shaft_name: form.shaft_name,
          shaft_flex: form.shaft_flex,
          release_year: form.release_year,
        }),
      });
      if (!res.ok) throw new Error("検索に失敗しました");
      const specs = await res.json();
      setForm((prev) => ({
        ...prev,
        loft: prev.loft ?? specs.loft ?? prev.loft,
        lie: prev.lie ?? specs.lie ?? prev.lie,
        length: prev.length ?? specs.length ?? prev.length,
        distance: prev.distance ?? specs.distance ?? prev.distance,
        weight: prev.weight ?? specs.weight ?? prev.weight,
        swing_weight: prev.swing_weight || specs.swing_weight || prev.swing_weight,
        head_volume: prev.head_volume ?? specs.head_volume ?? prev.head_volume,
        head_weight: prev.head_weight ?? specs.head_weight ?? prev.head_weight,
      }));
    } catch (error) {
      console.error("Autofill failed:", error);
    } finally {
      setIsSearching(false);
    }
  }
  */

  const presetNumbers = form.category ? (clubNumbersByCategory[form.category] ?? []) : [];

  const isPutter = form.category === "putter";
  const specInputClass = "w-[100px] rounded-lg border border-[#c4c4c4] bg-white px-2 py-1.5 text-center text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";
  const requiredBadge = <span className="ml-auto text-[10px] text-[#8b8b8b] border border-[#c4c4c4] rounded px-1 py-px mb-0.5">必須</span>;

  const hasPurchaseData = !!(form.release_year || form.purchase_date || form.purchase_shop || form.purchase_price);
  const hasShaftData = !!(form.shaft_name || form.shaft_flex || form.shaft_weight || form.frequency || form.kick_point);
  const hasGripData = !!(form.grip_name || form.grip_size);
  const hasHeadData = !!(form.bounce || form.sole_shape || form.face_angle || form.head_volume || form.head_weight);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    purchase: hasPurchaseData,
    shaft: hasShaftData,
    grip: hasGripData,
    head: hasHeadData,
  });

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => {
      const willOpen = !prev[key];
      if (willOpen) {
        setTimeout(() => {
          sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
      return { ...prev, [key]: willOpen };
    });
  }, []);

  function SpecCell({ label, unit, value, onChange, type = "number", step, min, max, placeholder = "—" }: {
    label: string; unit?: string; value: string | number | undefined | null;
    onChange: (v: string) => void; type?: "number" | "text"; step?: string; min?: number; max?: number; placeholder?: string;
  }) {
    const [editing, setEditing] = useState(false);
    const display = value != null && value !== "" ? `${value}${unit ? unit : ""}` : null;
    return editing ? (
      <div className="flex flex-col gap-0.5 rounded-lg border border-[#006728] bg-white p-2">
        <span className="text-[10px] text-[#8b8b8b]">{label}</span>
        <input
          type={type} step={step} min={min} max={max} value={value ?? ""} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          autoFocus
          className="w-full bg-transparent text-base font-bold outline-none"
        />
      </div>
    ) : (
      <button type="button" onClick={() => setEditing(true)}
        className="flex flex-col items-start rounded-lg border border-[#ececec] bg-[#fafafa] p-2 text-left">
        <span className="text-[10px] text-[#8b8b8b]">{label}</span>
        <span className={`text-base font-bold ${display ? "text-black" : "text-[#c4c4c4]"}`}>{display ?? "—"}</span>
      </button>
    );
  }

  function SpecRow({ label, unit, children, last }: { label: string; unit?: string; children: React.ReactNode; last?: boolean }) {
    return (
      <div className={last ? "" : "border-b border-[#ececec]"}>
        <div className="flex items-center py-3">
          <span className="flex-1 text-base">{label}</span>
          {children}
          <span className="w-[32px] text-sm text-left pl-1">{unit ?? ""}</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
      {/* Section 1: 基本情報 */}
      <SectionAccordion id="basic" title="基本情報" isOpen={openSections.basic ?? true} onToggle={toggleSection} sectionRef={(el) => { sectionRefs.current.basic = el; }}>
        <div className="flex flex-col gap-1">
        {/* 写真 */}
        {showImagePicker && (
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>写真</span>
            <div className="flex gap-2">
              {previewUrl && (
                <div className="relative h-20 w-20 shrink-0">
                  <img src={previewUrl} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
                  <button type="button" onClick={removeImage} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {!previewUrl && (
                <ImagePicker onPick={(file) => { setPendingFile(file); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(URL.createObjectURL(file)); }}>
                  <button type="button" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[#c4c4c4] text-[#8b8b8b]">
                    <Plus className="h-6 w-6" />
                  </button>
                </ImagePicker>
              )}
            </div>
          </div>
        )}

        {/* 種類 */}
        <div className="flex flex-col gap-0.5 py-1" data-field="category">
          <span className={labelClass}>種類 {requiredBadge}</span>
          <select value={form.category ?? ""} onChange={(e) => {
            const cat = e.target.value || undefined;
            update("category", cat);
            setUseCustomNumber(false);
            if (cat === "driver") { update("club_number", "1W"); }
            else if (cat === "putter") { update("club_number", "PT"); }
            else { update("club_number", ""); }
          }} className={`${selectClass} ${fieldError("category") ? "!border-red-400" : ""}`}>
            <option value="">選択してください</option>
            {categories.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </select>
          <FieldError message={fieldError("category")} />
        </div>

        {/* 番手 */}
        {form.category && form.category !== "driver" && form.category !== "putter" && (
          <div className="flex flex-col gap-1 py-1" data-field="club_number">
            <span className={labelClass}>番手 {requiredBadge}</span>
            <div className="flex flex-wrap gap-2">
              {presetNumbers.map((num) => (
                <button key={num} type="button" onClick={() => { setUseCustomNumber(false); update("club_number", num); }}
                  className={`rounded-full border px-2.5 py-1.5 text-sm font-bold ${!useCustomNumber && form.club_number === num ? "border-[#006728] bg-[#006728] text-white" : "border-[#c6c6c6] bg-white text-black"}`}>{num}</button>
              ))}
            </div>
            <div className="flex items-stretch pt-1.5">
              <button type="button" onClick={() => setUseCustomNumber(true)}
                className={`rounded-l-lg border border-[#c6c6c6] px-2.5 py-1.5 text-sm font-bold shrink-0 ${useCustomNumber ? "bg-[#006728] text-white border-[#006728]" : "bg-white text-black"}`}>その他</button>
              <input value={useCustomNumber ? (form.club_number ?? "") : ""} onChange={(e) => { setUseCustomNumber(true); update("club_number", e.target.value); }}
                className="flex-1 rounded-r-lg border border-l-0 border-[#c4c4c4] bg-white px-3 py-1.5 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]" />
            </div>
            <FieldError message={fieldError("club_number")} />
          </div>
        )}

        {/* メーカー */}
        <div className="flex flex-col gap-0.5 py-1" data-field="maker">
          <span className={labelClass}>メーカー {requiredBadge}</span>
          <input value={form.maker ?? ""} onChange={(e) => update("maker", e.target.value)} placeholder="メーカー名" className={`${inputClass} ${fieldError("maker") ? "!border-red-400" : ""}`} />
          <FieldError message={fieldError("maker")} />
        </div>

        {/* モデル名 */}
        <div className="flex flex-col gap-0.5 py-1" data-field="model">
          <span className={labelClass}>モデル名 {requiredBadge}</span>
          <input value={form.model ?? ""} onChange={(e) => update("model", e.target.value)} placeholder="モデル名" className={`${inputClass} ${fieldError("model") ? "!border-red-400" : ""}`} />
          <FieldError message={fieldError("model")} />
        </div>

        {/* 発売年 */}
        <div className="flex flex-col gap-0.5 py-1" data-field="release_year">
          <span className={labelClass}>発売年</span>
          <input type="number" min={1950} max={2028} value={form.release_year ?? ""} onChange={(e) => update("release_year", e.target.value ? Number(e.target.value) : undefined)} placeholder="2024" className={`${inputClass} ${fieldError("release_year") ? "!border-red-400" : ""}`} />
          <FieldError message={fieldError("release_year")} />
        </div>

        {/* 評価 */}
        <div className="flex flex-col gap-0.5 py-1">
          <span className={labelClass}>評価</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => update("rating", form.rating === star ? null : star)}
                className={`text-xl transition-colors ${form.rating != null && star <= form.rating ? "text-amber-400" : "text-gray-300"}`}>★</button>
            ))}
          </div>
        </div>

        {extraContent}
        </div>
      </SectionAccordion>

      {/* スペック */}
      <SectionAccordion id="spec" title="クラブスペック" isOpen={openSections.spec ?? true} onToggle={toggleSection} sectionRef={(el) => { sectionRefs.current.spec = el; }}>
        <div className="grid grid-cols-2 gap-1.5 py-1">
          <SpecCell label="ロフト角" unit="°" value={form.loft} step="0.5" min={0} max={90}
            onChange={(v) => update("loft", v ? Number(v) : undefined)} />
          <SpecCell label="ライ角" unit="°" value={form.lie} step="0.5" min={0} max={90}
            onChange={(v) => update("lie", v ? Number(v) : undefined)} />
          <SpecCell label="長さ" unit="inch" value={form.length} step="0.25" min={0} max={60}
            onChange={(v) => update("length", v ? Number(v) : undefined)} />
          <SpecCell label="総重量" unit="g" value={form.weight} step="0.1" min={0} max={1000}
            onChange={(v) => update("weight", v ? Number(v) : undefined)} />
          <SpecCell label="バランス" value={form.swing_weight} type="text" placeholder="D2"
            onChange={(v) => update("swing_weight", v || undefined)} />
        </div>
      </SectionAccordion>

      {/* シャフト（パター非表示） */}
      {!isPutter && (
        <SectionAccordion id="shaft" title="シャフト" isOpen={openSections.shaft ?? false} onToggle={toggleSection} sectionRef={(el) => { sectionRefs.current.shaft = el; }}>
          <div className="flex flex-col gap-1">
            <div className="flex flex-col gap-0.5 py-1" data-field="shaft_name">
              <span className={labelClass}>シャフト名</span>
              <input value={form.shaft_name ?? ""} onChange={(e) => update("shaft_name", e.target.value)} placeholder="シャフト名" className={`${inputClass} ${fieldError("shaft_name") ? "!border-red-400" : ""}`} />
              <FieldError message={fieldError("shaft_name")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5 py-1">
                <span className={labelClass}>素材</span>
                <select value={shaftType} onChange={(e) => { setShaftType(e.target.value as "carbon" | "steel"); update("shaft_flex", undefined); }} className={selectClass}>
                  <option value="carbon">カーボン</option>
                  <option value="steel">スチール</option>
                </select>
              </div>
              <div className="flex flex-col gap-0.5 py-1">
                <span className={labelClass}>フレックス</span>
                <select value={form.shaft_flex ?? ""} onChange={(e) => update("shaft_flex", e.target.value || undefined)} className={selectClass}>
                  <option value="">選択</option>
                  {shaftType === "carbon"
                    ? ["X", "S", "SR", "R", "R2", "L"].map((f) => <option key={f} value={f}>{f}</option>)
                    : steelFlexes.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 py-1">
              <SpecCell label="シャフト重量" unit="g" value={form.shaft_weight} step="1" min={0} max={200}
                onChange={(v) => update("shaft_weight", v ? Number(v) : undefined)} />
              <SpecCell label="振動数" unit="cpm" value={form.frequency} min={0} max={500}
                onChange={(v) => update("frequency", v ? Number(v) : undefined)} />
              <SpecCell label="キックポイント" value={form.kick_point} type="text" placeholder="—"
                onChange={(v) => update("kick_point", v || undefined)} />
            </div>
          </div>
        </SectionAccordion>
      )}

      {/* TODO: AI自動入力 — UX再設計後に復活
      {user && (
        <div className="flex flex-col items-center gap-1 rounded-lg bg-[#ebf1eb] p-3">
          <p className="text-sm text-black w-full">公開情報からスペックを自動入力します。内容に誤りがある場合があります。</p>
          <p className="text-xs text-[#8b8b8b] w-full">※ AIトークンを消費します</p>
          <button type="button" disabled={isSearching || (!form.maker && !form.model)} onClick={handleAutofill}
            className="rounded-full border border-[#006728] bg-white px-5 py-1 text-xs font-bold text-[#006728] disabled:opacity-50">
            {isSearching ? "検索中..." : "スペック自動入力"}
          </button>
        </div>
      )}
      */}

      {/* Section 2: 購入情報 */}
      <SectionAccordion id="purchase" title="購入情報" isOpen={openSections.purchase ?? false} onToggle={toggleSection} sectionRef={(el) => { sectionRefs.current.purchase = el; }}>
        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>購入日</span>
            <input type="date" value={form.purchase_date ?? ""} onChange={(e) => update("purchase_date", e.target.value || undefined)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1" data-field="purchase_shop">
            <span className={labelClass}>購入店</span>
            <input value={form.purchase_shop ?? ""} onChange={(e) => update("purchase_shop", e.target.value)} className={`${inputClass} ${fieldError("purchase_shop") ? "!border-red-400" : ""}`} />
            <FieldError message={fieldError("purchase_shop")} />
          </div>
          <div className="flex flex-col gap-0.5 py-1" data-field="purchase_price">
            <span className={labelClass}>価格（円）</span>
            <input type="number" min={0} value={form.purchase_price ?? ""} onChange={(e) => update("purchase_price", e.target.value ? Number(e.target.value) : undefined)} className={`${inputClass} ${fieldError("purchase_price") ? "!border-red-400" : ""}`} />
            <FieldError message={fieldError("purchase_price")} />
          </div>
        </div>
      </SectionAccordion>

      {/* Section 4: グリップ */}
      <SectionAccordion id="grip" title="グリップ" isOpen={openSections.grip ?? false} onToggle={toggleSection} sectionRef={(el) => { sectionRefs.current.grip = el; }}>
        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>グリップ名</span>
            <input value={form.grip_name ?? ""} onChange={(e) => update("grip_name", e.target.value)} placeholder="銘柄名" className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>太さ</span>
            <input value={form.grip_size ?? ""} onChange={(e) => update("grip_size", e.target.value)} placeholder="M60" className={inputClass} />
          </div>
        </div>
      </SectionAccordion>

      {/* Section 5: ヘッドスペック */}
      <SectionAccordion id="head" title="ヘッドスペック" isOpen={openSections.head ?? false} onToggle={toggleSection} sectionRef={(el) => { sectionRefs.current.head = el; }}>
        <div className="flex flex-col">
          {form.category === "wedge" && (
            <>
              <SpecRow label="バウンス角" unit="°">
                <input type="number" step="1" min={0} max={30} value={form.bounce ?? ""} onChange={(e) => update("bounce", e.target.value ? Number(e.target.value) : undefined)} placeholder="—" className={specInputClass} />
              </SpecRow>
              <SpecRow label="ソール形状">
                <select value={form.sole_shape ?? ""} onChange={(e) => update("sole_shape", e.target.value || undefined)} className={specInputClass}>
                  <option value="">—</option>
                  {["ワイド", "セミワイド", "ナロー", "Cグラインド", "Sグラインド", "Wグラインド"].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </SpecRow>
            </>
          )}
          {form.category === "driver" && (
            <SpecRow label="フェース角" unit="°">
              <input type="number" step="0.5" min={-5} max={5} value={form.face_angle ?? ""} onChange={(e) => update("face_angle", e.target.value ? Number(e.target.value) : undefined)} placeholder="—" className={specInputClass} />
            </SpecRow>
          )}
          {(form.category === "driver" || form.category === "fairway_wood") && (
            <SpecRow label="ヘッド体積" unit="cc">
              <input type="number" min={0} max={600} value={form.head_volume ?? ""} onChange={(e) => update("head_volume", e.target.value ? Number(e.target.value) : undefined)} placeholder="—" className={specInputClass} />
            </SpecRow>
          )}
          <SpecRow label="ヘッド重量" unit="g" last>
            <input type="number" step="0.1" min={0} max={400} value={form.head_weight ?? ""} onChange={(e) => update("head_weight", e.target.value ? Number(e.target.value) : undefined)} placeholder="—" className={specInputClass} />
          </SpecRow>
        </div>
      </SectionAccordion>

      {/* Buttons */}
      <div className="flex flex-col items-center gap-4 px-4 pt-6 pb-8">
        <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-white py-3 text-base font-bold text-[#006728] disabled:opacity-50">
          {isSubmitting ? "保存中..." : "保存する"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-base font-bold text-white">
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}
