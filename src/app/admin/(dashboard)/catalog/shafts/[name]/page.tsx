"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { apiFetch } from "@/lib/api-client";

interface Shaft {
  id: string;
  shaft_name: string;
  maker: string | null;
  shaft_type: string | null;
  flex: string | null;
  shaft_weight: number | null;
  torque: number | null;
  kick_point: string | null;
  image_url: string | null;
  is_visible: boolean;
  verification_status: string;
  spec_updated_at: string | null;
}

const SPEC_FIELDS = [
  { key: "shaft_weight", label: "重量(g)", type: "number" as const },
  { key: "torque", label: "トルク(°)", type: "number" as const },
  { key: "kick_point", label: "キックポイント", type: "text" as const },
];

const FLEX_PRESETS = ["R", "SR", "S", "X", "L", "A", "S200", "S300", "S400"];

function ShaftEditInner() {
  const { name: encodedName } = useParams<{ name: string }>();
  const shaftName = decodeURIComponent(encodedName);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  // Fetch all variants with this shaft_name
  const { data: allShafts = [], mutate } = useSWR<Shaft[]>(
    `/api/admin/catalog/shafts?search=${encodeURIComponent(shaftName)}`,
    async (url: string) => {
      const res = await apiFetch(url);
      if (!res.ok) return [];
      const data: Shaft[] = await res.json();
      return data.filter((s) => s.shaft_name === shaftName);
    }
  );

  // Common info (from first variant)
  const [editName, setEditName] = useState(shaftName);
  const [commonInfo, setCommonInfo] = useState({ maker: "", shaft_type: "" as string | null, is_visible: true, verification_status: "unverified", spec_updated_at: "" });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [variants, setVariants] = useState<Shaft[]>([]);
  const [newFlex, setNewFlex] = useState("");

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (initialized || allShafts.length === 0) return;
    setCommonInfo({
      maker: allShafts[0].maker ?? "",
      shaft_type: allShafts[0].shaft_type,
      is_visible: allShafts[0].is_visible,
      verification_status: allShafts[0].verification_status,
      spec_updated_at: allShafts[0].spec_updated_at?.slice(0, 10) ?? "",
    });
    setImageUrl(allShafts.find((s) => s.image_url)?.image_url ?? null);
    setVariants(allShafts);
    setInitialized(true);
  }, [allShafts, initialized]);

  function updateVariantField(id: string, field: string, value: string) {
    setVariants(variants.map((v) => {
      if (v.id !== id) return v;
      if (field === "shaft_weight" || field === "torque") {
        return { ...v, [field]: value ? Number(value) : null };
      }
      return { ...v, [field]: value };
    }));
  }

  function addFlex(flex: string) {
    if (!flex || variants.some((v) => v.flex === flex)) return;
    setVariants([...variants, {
      id: `new-${Date.now()}-${flex}`,
      shaft_name: shaftName,
      maker: commonInfo.maker || null,
      shaft_type: commonInfo.shaft_type,
      flex,
      shaft_weight: null,
      torque: null,
      kick_point: null,
      image_url: imageUrl,
      is_visible: true,
      verification_status: "unverified",
      spec_updated_at: null,
    }]);
  }

  function removeFlex(id: string) {
    setVariants(variants.filter((v) => v.id !== id));
  }

  async function handleImageUpload(file: File) {
    const formData = new FormData();
    formData.append("model_id", "shaft-" + shaftName);
    formData.append("file", file);
    const res = await apiFetch("/api/admin/catalog/model-images", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      setImageUrl(data.image_url);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const existingIds = new Set(allShafts.map((s) => s.id));
      const toUpdate = variants.filter((v) => existingIds.has(v.id));
      const toCreate = variants.filter((v) => v.id.startsWith("new-"));
      const toDelete = allShafts.filter((s) => !variants.some((v) => v.id === s.id));

      // Delete removed
      await Promise.all(toDelete.map((s) =>
        apiFetch("/api/admin/catalog/shafts", {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: s.id }),
        })
      ));

      // Update existing
      await Promise.all(toUpdate.map((v) =>
        apiFetch("/api/admin/catalog/shafts", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: v.id,
            shaft_name: editName,
            maker: commonInfo.maker || null,
            shaft_type: commonInfo.shaft_type || null,
            is_visible: commonInfo.is_visible,
            verification_status: commonInfo.verification_status,
            spec_updated_at: commonInfo.spec_updated_at || null,
            flex: v.flex,
            shaft_weight: v.shaft_weight,
            torque: v.torque,
            kick_point: v.kick_point || null,
            image_url: imageUrl,
          }),
        })
      ));

      // Create new
      await Promise.all(toCreate.map((v) =>
        apiFetch("/api/admin/catalog/shafts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shaft_name: editName,
            maker: commonInfo.maker || null,
            shaft_type: commonInfo.shaft_type || null,
            is_visible: commonInfo.is_visible,
            verification_status: commonInfo.verification_status,
            spec_updated_at: commonInfo.spec_updated_at || null,
            flex: v.flex,
            shaft_weight: v.shaft_weight,
            torque: v.torque,
            kick_point: v.kick_point || null,
            image_url: imageUrl,
          }),
        })
      ));

      // If name changed, redirect to new URL
      if (editName !== shaftName) {
        router.push(`/admin/catalog/shafts/${encodeURIComponent(editName)}`);
      } else {
        mutate();
      }
      alert("保存しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAll() {
    if (!confirm(`「${shaftName}」の全フレックスを削除しますか？`)) return;
    await Promise.all(allShafts.map((s) =>
      apiFetch("/api/admin/catalog/shafts", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id }),
      })
    ));
    router.push("/admin/catalog/shafts");
  }

  if (!initialized) return <div className="p-4 text-sm text-[#888]">読み込み中...</div>;

  const existingFlexes = new Set(variants.map((v) => v.flex));

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[
        { label: "カタログ", href: "/admin/catalog" },
        { label: "シャフト管理", href: "/admin/catalog/shafts" },
        { label: shaftName },
      ]} />
      <h1 className="text-xl font-bold">{shaftName}</h1>

      {/* Common info + image */}
      <AdminFormSection title="基本情報">
        <div className="flex gap-6">
          {/* Image */}
          <div
            className="w-24 h-24 rounded-lg border border-[#e5e5e5] bg-[#f5f5f5] flex items-center justify-center overflow-hidden cursor-pointer shrink-0 hover:border-[#006728]"
            onClick={() => fileRef.current?.click()}
            title="クリックで画像変更"
          >
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-[#bbb]">写真を追加</span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }}
          />
          <div className="grid grid-cols-2 gap-3 flex-1">
            <label className="block text-xs font-bold text-[#555]">
              シャフト名
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              メーカー
              <input value={commonInfo.maker} onChange={(e) => setCommonInfo({ ...commonInfo, maker: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" placeholder="例: フジクラ" />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              種類
              <select value={commonInfo.shaft_type ?? ""} onChange={(e) => setCommonInfo({ ...commonInfo, shaft_type: e.target.value || null })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm">
                <option value="">未設定</option>
                <option value="カーボンシャフト">カーボンシャフト</option>
                <option value="スチールシャフト">スチールシャフト</option>
              </select>
            </label>
            <div />
          </div>
        </div>
        <div className="flex items-center gap-6 mt-3">
          <label className="flex items-center gap-2 text-xs font-bold text-[#555]">
            <input type="checkbox" checked={commonInfo.is_visible} onChange={(e) => setCommonInfo({ ...commonInfo, is_visible: e.target.checked })} />
            公開する
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-[#555]">
            確認状態
            <select value={commonInfo.verification_status} onChange={(e) => setCommonInfo({ ...commonInfo, verification_status: e.target.value })} className="rounded-md border border-input px-2 py-1 text-sm">
              <option value="unverified">未確認</option>
              <option value="in_review">確認中</option>
              <option value="verified">確認済み</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-[#555]">
            情報更新日
            <input type="date" value={commonInfo.spec_updated_at} onChange={(e) => setCommonInfo({ ...commonInfo, spec_updated_at: e.target.value })} className="rounded-md border border-input px-2 py-1 text-sm" />
          </label>
        </div>
      </AdminFormSection>

      {/* Horizontal spec grid */}
      <AdminFormSection title="フレックス別スペック">
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                <th className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-left text-[11px] text-[#888] font-medium min-w-[120px]">
                  スペック項目
                </th>
                {variants.map((v) => (
                  <th key={v.id} className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-center text-[11px] font-medium min-w-[80px]">
                    <div className="flex items-center justify-center gap-1">
                      {v.flex ?? "-"}
                      <button onClick={() => removeFlex(v.id)} className="text-[#ccc] hover:text-red-600 text-xs">&times;</button>
                    </div>
                  </th>
                ))}
                <th className="border border-[#e5e5e5] bg-[#fafafa] px-2 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      value={newFlex}
                      onChange={(e) => setNewFlex(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFlex(newFlex.trim()); setNewFlex(""); } }}
                      placeholder="フレックス"
                      className="w-16 rounded border border-input px-1 py-0.5 text-[11px]"
                    />
                    <button onClick={() => { addFlex(newFlex.trim()); setNewFlex(""); }} className="text-[#006728] text-xs font-bold">+</button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {SPEC_FIELDS.map((field) => (
                <tr key={field.key}>
                  <td className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-1.5 text-xs font-medium text-[#555]">
                    {field.label}
                  </td>
                  {variants.map((v) => (
                    <td key={v.id} className="border border-[#e5e5e5] px-1 py-0.5">
                      <input
                        type={field.type}
                        step={field.type === "number" ? "any" : undefined}
                        value={v[field.key as keyof Shaft] != null ? String(v[field.key as keyof Shaft]) : ""}
                        onChange={(e) => updateVariantField(v.id, field.key, e.target.value)}
                        className="w-full text-center text-xs px-1 py-1 bg-transparent focus:bg-white focus:outline focus:outline-[#006728] rounded"
                        placeholder="-"
                      />
                    </td>
                  ))}
                  <td className="border border-[#e5e5e5]" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Flex preset buttons */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-xs text-[#888] mr-1">追加:</span>
          {FLEX_PRESETS.filter((f) => !existingFlexes.has(f)).map((flex) => (
            <button
              key={flex}
              type="button"
              onClick={() => addFlex(flex)}
              className="rounded-full px-2 py-0.5 text-[11px] border border-[#ddd] text-[#555] hover:border-[#006728] hover:text-[#006728]"
            >
              {flex}
            </button>
          ))}
        </div>
      </AdminFormSection>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving} className="rounded bg-[#006728] px-6 py-2 text-sm font-bold text-white hover:bg-[#005520] disabled:opacity-50">
          {saving ? "保存中..." : "保存"}
        </button>
        <button onClick={() => router.push("/admin/catalog/shafts")} className="rounded border border-[#ddd] px-6 py-2 text-sm hover:bg-[#f5f5f5]">キャンセル</button>
        <button onClick={handleDeleteAll} className="ml-auto rounded border border-red-300 px-6 py-2 text-sm text-red-600 hover:bg-red-50">シリーズ削除</button>
      </div>
    </div>
  );
}

export default function ShaftEditPage() {
  return <Suspense><ShaftEditInner /></Suspense>;
}
