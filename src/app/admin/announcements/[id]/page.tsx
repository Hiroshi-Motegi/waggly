"use client";

import { Suspense, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { apiFetch } from "@/lib/api-client";

interface Announcement {
  id: string; title: string; category: string;
  published_at: string; body: string; is_published: boolean;
}

function AnnouncementEditForm() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { data: announcement } = useSWR<Announcement>(
    `/api/admin/announcements/${id}`,
    async (url: string) => { const res = await apiFetch(url); return res.ok ? res.json() : null; }
  );

  const [form, setForm] = useState({ title: "", category: "info", published_at: "", body: "", is_published: false });

  useEffect(() => {
    if (announcement) setForm({
      title: announcement.title, category: announcement.category,
      published_at: announcement.published_at.slice(0, 10),
      body: announcement.body, is_published: announcement.is_published,
    });
  }, [announcement]);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/announcements/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      router.push("/admin/announcements");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm("削除しますか？")) return;
    await apiFetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    router.push("/admin/announcements");
  }

  if (!announcement) return <div className="p-4 text-sm text-[#888]">読み込み中...</div>;

  return (
    <div className="space-y-4 p-4 max-w-2xl">
      <AdminBreadcrumb items={[{ label: "お知らせ", href: "/admin/announcements" }, { label: form.title || "編集" }]} />
      <h1 className="text-xl font-bold">お知らせ編集</h1>
      <AdminFormSection title="内容">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[#555]">タイトル *
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-[#555]">カテゴリ
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm">
                <option value="info">お知らせ</option>
                <option value="feature">機能追加</option>
                <option value="maintenance">メンテナンス</option>
                <option value="campaign">キャンペーン</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-[#555]">公開日
              <input type="date" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-xs font-bold text-[#555]">本文 (Markdown)
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={10} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm font-mono" />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-[#555]">
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
            公開する
          </label>
        </div>
      </AdminFormSection>
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className="rounded bg-[#006728] px-6 py-2 text-sm font-bold text-white hover:bg-[#005520] disabled:opacity-50">{saving ? "保存中..." : "保存"}</button>
        <button onClick={() => router.push("/admin/announcements")} className="rounded border border-[#ddd] px-6 py-2 text-sm hover:bg-[#f5f5f5]">キャンセル</button>
        <button onClick={handleDelete} className="ml-auto rounded border border-red-300 px-6 py-2 text-sm text-red-600 hover:bg-red-50">削除</button>
      </div>
    </div>
  );
}

export default function AnnouncementEditPage() {
  return <Suspense><AnnouncementEditForm /></Suspense>;
}
