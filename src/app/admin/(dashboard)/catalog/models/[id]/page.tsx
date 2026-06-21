"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { SpecGridEditor } from "@/components/admin/spec-grid-editor";
import { ShaftSpecEditor } from "@/components/admin/shaft-spec-editor";
import { ModelImagesEditor } from "@/components/admin/model-images-editor";
import { ModelLinksEditor } from "@/components/admin/model-links-editor";
import { ModelAttributesEditor } from "@/components/admin/model-attributes-editor";
import { apiFetch } from "@/lib/api-client";

interface CatalogModel {
  id: string; name: string; maker: string; maker_id: string; maker_slug: string;
  category: string; category_slug: string; slug: string | null;
  description: string | null; price: number | null;
  release_year: number | null; release_month: number | null;
  is_visible: boolean; verification_status: string; spec_updated_at: string | null;
}

interface SpecRow {
  id: string; club_number: string; model_id: string;
  loft: number | null; lie: number | null; length: number | null;
  bounce: number | null; head_volume: number | null; head_weight: number | null;
  face_angle: number | null; weight: number | null; swing_weight: string | null;
  shaft_name: string | null; shaft_flex: string | null; sort_order: number;
  [key: string]: unknown;
}

interface ModelImage { id: string; image_url: string; sort_order: number; }
interface ModelLink { id?: string; label: string; url: string; sort_order: number; model_id?: string; }
interface ModelAttr { id?: string; label: string; value: string; sort_order: number; model_id?: string; }
interface Maker { id: string; name: string; slug: string; }
interface ShaftOption { id: string; shaft_name: string; flex: string | null; }

const categories = [
  { value: "driver", slug: "driver", label: "ドライバー" },
  { value: "fairway", slug: "fairway", label: "フェアウェイウッド" },
  { value: "utility", slug: "utility", label: "ユーティリティ" },
  { value: "iron", slug: "iron", label: "アイアン" },
  { value: "wedge", slug: "wedge", label: "ウェッジ" },
  { value: "putter", slug: "putter", label: "パター" },
];

async function fetcher<T>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (!res.ok) return [] as unknown as T;
  return res.json();
}

function ModelEditInner() {
  const { id: modelId } = useParams<{ id: string }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // ---- Data fetching ----
  const { data: model, mutate: mutateModel } = useSWR<CatalogModel | null>(
    `/api/admin/catalog/models?id=${modelId}`,
    async (url: string) => {
      const res = await apiFetch(url);
      if (!res.ok) return null;
      return res.json();
    }
  );

  const { data: specsRaw = [], mutate: mutateSpecs } = useSWR<SpecRow[]>(
    `/api/admin/catalog/specs?model_id=${modelId}`, (url: string) => fetcher<SpecRow[]>(url)
  );

  const { data: images = [], mutate: mutateImages } = useSWR<ModelImage[]>(
    `/api/admin/catalog/model-images?model_id=${modelId}`, (url: string) => fetcher<ModelImage[]>(url)
  );

  const { data: linksRaw = [] } = useSWR<ModelLink[]>(
    `/api/admin/catalog/model-links?model_id=${modelId}`, (url: string) => fetcher<ModelLink[]>(url)
  );

  const { data: attrsRaw = [] } = useSWR<ModelAttr[]>(
    `/api/admin/catalog/model-attributes?model_id=${modelId}`, (url: string) => fetcher<ModelAttr[]>(url)
  );

  const { data: makers = [] } = useSWR<Maker[]>("/api/admin/catalog/makers", (url: string) => fetcher<Maker[]>(url));
  const { data: shaftOptions = [] } = useSWR<ShaftOption[]>("/api/admin/catalog/shafts", (url: string) => fetcher<ShaftOption[]>(url));

  // ---- Local state (editable copies) ----
  const [form, setForm] = useState<Partial<CatalogModel>>({});
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [links, setLinks] = useState<ModelLink[]>([]);
  const [attrs, setAttrs] = useState<ModelAttr[]>([]);
  const [originalSpecIds, setOriginalSpecIds] = useState<Set<string>>(new Set());

  // Sync fetched data to local state (only on initial load, not on every SWR revalidation)
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (initialized || !model) return;
    setForm(model);
    setInitialized(true);
  }, [model, initialized]);

  const [specsInitialized, setSpecsInitialized] = useState(false);
  useEffect(() => {
    if (specsInitialized || specsRaw.length === 0) return;
    setSpecs(specsRaw);
    setOriginalSpecIds(new Set(specsRaw.map((s) => s.id)));
    setSpecsInitialized(true);
  }, [specsRaw, specsInitialized]);

  const [linksInitialized, setLinksInitialized] = useState(false);
  useEffect(() => {
    if (linksInitialized) return;
    if (linksRaw.length > 0) { setLinks(linksRaw); setLinksInitialized(true); }
  }, [linksRaw, linksInitialized]);

  const [attrsInitialized, setAttrsInitialized] = useState(false);
  useEffect(() => {
    if (attrsInitialized) return;
    if (attrsRaw.length > 0) { setAttrs(attrsRaw); setAttrsInitialized(true); }
  }, [attrsRaw, attrsInitialized]);

  // ---- Spec mutations ----
  const headSpecs = specs.filter((s) => !s.shaft_name);
  const clubNumbers = [...new Set(headSpecs.map((s) => s.club_number))];

  const handleAddClubNumber = useCallback((cn: string) => {
    // Add a new head-spec row for this club number
    const newSpec: SpecRow = {
      id: `new-${Date.now()}-${cn}`,
      club_number: cn, model_id: modelId,
      loft: null, lie: null, length: null, bounce: null,
      head_volume: null, head_weight: null, face_angle: null,
      weight: null, swing_weight: null,
      shaft_name: null, shaft_flex: null,
      sort_order: specs.length,
    };
    setSpecs((prev) => [...prev, newSpec]);
  }, [modelId, specs.length]);

  const handleRemoveClubNumber = useCallback((cn: string) => {
    setSpecs((prev) => prev.filter((s) => s.club_number !== cn));
  }, []);

  const handleAddShaft = useCallback((shaftName: string, shaftFlex: string) => {
    // Add spec rows for each existing club number for this shaft
    const newRows = clubNumbers.map((cn, i) => ({
      id: `new-shaft-${Date.now()}-${cn}`,
      club_number: cn, model_id: modelId,
      loft: null, lie: null, length: null, bounce: null,
      head_volume: null, head_weight: null, face_angle: null,
      weight: null, swing_weight: null,
      shaft_name: shaftName, shaft_flex: shaftFlex,
      sort_order: specs.length + i,
    } as SpecRow));
    setSpecs((prev) => [...prev, ...newRows]);
  }, [clubNumbers, modelId, specs.length]);

  const handleRemoveShaft = useCallback((shaftName: string, shaftFlex: string) => {
    setSpecs((prev) => prev.filter((s) => !(s.shaft_name === shaftName && s.shaft_flex === shaftFlex)));
  }, []);

  // ---- Save all ----
  async function handleSave() {
    if (!model) return;
    setSaving(true);
    try {
      // 1. Update model basic info
      const selectedMaker = makers.find((m) => m.id === form.maker_id);
      const selectedCat = categories.find((c) => c.value === form.category);
      await apiFetch("/api/admin/catalog/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: modelId,
          name: form.name, maker_id: form.maker_id,
          maker: selectedMaker?.name, maker_slug: selectedMaker?.slug,
          category: form.category, category_slug: selectedCat?.slug,
          slug: form.slug, description: form.description,
          price: form.price, release_year: form.release_year,
          release_month: form.release_month, is_visible: form.is_visible,
          verification_status: form.verification_status,
        }),
      });

      // 2. Save specs: update existing, create new, delete removed
      const currentIds = new Set(specs.map((s) => s.id));
      const toDelete = [...originalSpecIds].filter((id) => !currentIds.has(id));
      const toUpdate = specs.filter((s) => originalSpecIds.has(s.id));
      const toCreate = specs.filter((s) => s.id.startsWith("new-"));

      await Promise.all(toDelete.map((id) =>
        apiFetch("/api/admin/catalog/specs", {
          method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
        })
      ));

      if (toUpdate.length > 0) {
        await apiFetch("/api/admin/catalog/specs", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toUpdate.map((s) => ({
            id: s.id, club_number: s.club_number, loft: s.loft, lie: s.lie, length: s.length,
            bounce: s.bounce, head_volume: s.head_volume, head_weight: s.head_weight,
            face_angle: s.face_angle, weight: s.weight, swing_weight: s.swing_weight,
            shaft_name: s.shaft_name, shaft_flex: s.shaft_flex, sort_order: s.sort_order,
          }))),
        });
      }

      if (toCreate.length > 0) {
        await apiFetch("/api/admin/catalog/specs", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toCreate.map((s) => ({
            model_id: modelId, club_number: s.club_number, loft: s.loft, lie: s.lie, length: s.length,
            bounce: s.bounce, head_volume: s.head_volume, head_weight: s.head_weight,
            face_angle: s.face_angle, weight: s.weight, swing_weight: s.swing_weight,
            shaft_name: s.shaft_name, shaft_flex: s.shaft_flex, sort_order: s.sort_order,
          }))),
        });
      }

      // 3. Save links: bulk delete all existing + bulk insert current
      // This avoids N+1 update/create loops. 2 operations total.
      const existingLinkIds = linksRaw.map((l) => l.id).filter(Boolean) as string[];
      if (existingLinkIds.length > 0) {
        await Promise.all(existingLinkIds.map((id) =>
          apiFetch("/api/admin/catalog/model-links", {
            method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
          })
        ));
      }
      const validLinks = links.filter((l) => l.label && l.url);
      if (validLinks.length > 0) {
        await Promise.all(validLinks.map((link) =>
          apiFetch("/api/admin/catalog/model-links", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model_id: modelId, label: link.label, url: link.url, sort_order: link.sort_order }),
          })
        ));
      }

      // 4. Save attributes: bulk delete all existing + bulk insert current
      const existingAttrIds = attrsRaw.map((a) => a.id).filter(Boolean) as string[];
      if (existingAttrIds.length > 0) {
        await Promise.all(existingAttrIds.map((id) =>
          apiFetch("/api/admin/catalog/model-attributes", {
            method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
          })
        ));
      }
      const validAttrs = attrs.filter((a) => a.label && a.value);
      if (validAttrs.length > 0) {
        await Promise.all(validAttrs.map((attr) =>
          apiFetch("/api/admin/catalog/model-attributes", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model_id: modelId, label: attr.label, value: attr.value, sort_order: attr.sort_order }),
          })
        ));
      }

      // Refresh all data
      await Promise.all([mutateModel(), mutateSpecs(), mutateImages()]);
      alert("保存しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("このモデルを削除しますか？関連するスペック・画像・リンク・属性もすべて削除されます。")) return;
    await apiFetch("/api/admin/catalog/models", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: modelId }),
    });
    router.push("/admin/catalog");
  }

  if (model === undefined) return <div className="p-4 text-sm text-[#888]">読み込み中...</div>;
  if (model === null) return <div className="p-4 text-sm text-red-600">モデルが見つかりません</div>;

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[
        { label: "モデル管理", href: "/admin/catalog" },
        { label: model.name },
      ]} />
      <h1 className="text-xl font-bold">{model.name}</h1>

      {/* Basic info */}
      <AdminFormSection title="基本情報">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-[#555]">モデル名 *
            <input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-bold text-[#555]">メーカー
            <select value={form.maker_id ?? ""} onChange={(e) => setForm({ ...form, maker_id: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm">
              {makers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-[#555]">カテゴリ
            <select value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm">
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-[#555]">Slug
            <input value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm font-mono" />
          </label>
          <label className="block text-xs font-bold text-[#555]">発売年
            <input type="number" value={form.release_year ?? ""} onChange={(e) => setForm({ ...form, release_year: e.target.value ? Number(e.target.value) : null })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-bold text-[#555]">発売月
            <select value={form.release_month ?? ""} onChange={(e) => setForm({ ...form, release_month: e.target.value ? Number(e.target.value) : null })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm">
              <option value="">未設定</option>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-[#555]">価格(税込)
            <input type="number" value={form.price ?? ""} onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : null })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-bold text-[#555]">説明
            <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value || null })} rows={2} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="flex items-center gap-6 mt-2">
          <label className="flex items-center gap-2 text-xs font-bold text-[#555]">
            <input type="checkbox" checked={form.is_visible ?? false} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} />
            公開する
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-[#555]">
            確認状態
            <select
              value={form.verification_status ?? "unverified"}
              onChange={(e) => setForm({ ...form, verification_status: e.target.value })}
              className="rounded-md border border-input px-2 py-1 text-sm"
            >
              <option value="unverified">未確認</option>
              <option value="in_review">確認中</option>
              <option value="verified">確認済み</option>
            </select>
          </label>
        </div>
      </AdminFormSection>

      {/* Head specs */}
      <AdminFormSection title="ヘッドスペック">
        <SpecGridEditor
          modelId={modelId}
          specs={specs}
          onChange={(updated) => setSpecs(updated)}
          onAddClubNumber={handleAddClubNumber}
          onRemoveClubNumber={handleRemoveClubNumber}
        />
      </AdminFormSection>

      {/* Shaft specs */}
      <AdminFormSection title="シャフト別クラブスペック">
        <ShaftSpecEditor
          specs={specs}
          clubNumbers={clubNumbers}
          shaftOptions={shaftOptions}
          onChange={(updated) => setSpecs(updated as SpecRow[])}
          onAddShaft={handleAddShaft}
          onRemoveShaft={handleRemoveShaft}
        />
      </AdminFormSection>

      {/* Images */}
      <AdminFormSection title="画像">
        <ModelImagesEditor modelId={modelId} images={images} onMutate={() => mutateImages()} />
      </AdminFormSection>

      {/* Purchase links */}
      <AdminFormSection title="購入先リンク">
        <ModelLinksEditor links={links} onChange={setLinks} />
      </AdminFormSection>

      {/* Attributes */}
      <AdminFormSection title="その他情報">
        <ModelAttributesEditor attributes={attrs} onChange={setAttrs} />
      </AdminFormSection>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving} className="rounded bg-[#006728] px-6 py-2 text-sm font-bold text-white hover:bg-[#005520] disabled:opacity-50">
          {saving ? "保存中..." : "保存"}
        </button>
        <button onClick={() => router.push("/admin/catalog")} className="rounded border border-[#ddd] px-6 py-2 text-sm hover:bg-[#f5f5f5]">キャンセル</button>
        <button onClick={handleDelete} className="ml-auto rounded border border-red-300 px-6 py-2 text-sm text-red-600 hover:bg-red-50">削除</button>
      </div>
    </div>
  );
}

export default function ModelEditPage() {
  return <Suspense><ModelEditInner /></Suspense>;
}
