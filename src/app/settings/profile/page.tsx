"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, updateProfile, uploadAvatar } from "@/hooks/use-profile";
import { Loading } from "@/components/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";
import { ImagePicker } from "@/components/ui/image-picker";
import { CoverImageGallery } from "@/components/profile/cover-image-gallery";
import type { ProfileCoverImage } from "@/types/database";
import { apiFetch } from "@/lib/api-client";

const inputClass = "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";
const labelClass = "text-sm";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    nickname: "",
    golf_start_date: "" as string,
    average_score: null as number | null,
    best_score: null as number | null,
    home_course: "",
    bio: "",
    sns_instagram: "",
    sns_x: "",
    custom_links: [] as { label: string; url: string }[],
  });

  useEffect(() => {
    if (profile) {
      setForm({
        nickname: profile.nickname ?? "",
        golf_start_date: profile.golf_start_date ?? "",
        average_score: profile.average_score,
        best_score: profile.best_score,
        home_course: profile.home_course ?? "",
        bio: profile.bio ?? "",
        sns_instagram: profile.sns_links?.instagram ?? "",
        sns_x: profile.sns_links?.x ?? "",
        custom_links: (profile.sns_links as any)?.custom_links ?? [],
      });
    }
  }, [profile]);

  const [coverImages, setCoverImages] = useState<ProfileCoverImage[]>([]);

  useEffect(() => {
    async function loadCoverImages() {
      try {
        const res = await apiFetch("/api/profile/cover-images");
        if (res.ok) setCoverImages(await res.json());
      } catch {}
    }
    loadCoverImages();
  }, []);

  if (!user) return null;
  if (isLoading) return <Loading variant="light" />;

  function update(field: string, value: string | number | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAvatarPick(file: File) {
    setIsUploading(true);
    try {
      await uploadAvatar(file);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const snsLinks: Record<string, any> = {};
      if (form.sns_instagram) snsLinks.instagram = form.sns_instagram;
      if (form.sns_x) snsLinks.x = form.sns_x;
      const validLinks = form.custom_links.filter((l) => l.label && l.url);
      if (validLinks.length > 0) snsLinks.custom_links = validLinks;

      await updateProfile({
        nickname: form.nickname || null,
        golf_start_date: form.golf_start_date || null,
        average_score: form.average_score,
        best_score: form.best_score,
        home_course: form.home_course || null,
        bio: form.bio || null,
        sns_links: snsLinks as any,
      });
      router.back();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      {isSaving && <ProcessingOverlay />}
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="プロフィール設定" variant="dark" />

        {/* Avatar */}
        <h3 className="px-1 pt-2 text-lg font-bold text-white">写真</h3>
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#006728] text-white text-xl">
                  {(profile?.nickname ?? user.display_name ?? "?")[0]}
                </AvatarFallback>
              </Avatar>
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <ImagePicker onPick={handleAvatarPick}>
              <button
                type="button"
                className="rounded-full border border-[#006728] px-4 py-1.5 text-sm font-bold text-[#006728]"
              >
                変更
              </button>
            </ImagePicker>
          </div>
        </div>

        {/* Cover images */}
        <h3 className="px-1 pt-2 text-lg font-bold text-white">カバー画像</h3>
        <div className="rounded-lg bg-white p-3">
          <p className="text-sm text-[#8b8b8b] pb-2">名刺ページの背景に表示されます（最大5枚、2:1比率）</p>
          <CoverImageGallery
            images={coverImages}
            onUpload={(img) => setCoverImages((prev) => [...prev, img])}
            onDelete={(id) => setCoverImages((prev) => prev.filter((img) => img.id !== id))}
            onReorder={setCoverImages}
          />
        </div>

        {/* Basic info */}
        <h3 className="px-1 pt-2 text-lg font-bold text-white">基本情報</h3>
        <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>ニックネーム</span>
            <input value={form.nickname} onChange={(e) => update("nickname", e.target.value)} placeholder="表示名" className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>ひとこと</span>
            <textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder="自己紹介..." rows={3} maxLength={140} className={inputClass} />
            <span className="text-xs text-[#8b8b8b] text-right">{form.bio.length}/140</span>
          </div>
        </div>

        {/* Golf info */}
        <h3 className="px-1 pt-2 text-lg font-bold text-white">ゴルフ情報</h3>
        <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>ゴルフを始めた日</span>
            <input type="date" value={form.golf_start_date} onChange={(e) => update("golf_start_date", e.target.value || null)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>平均スコア</span>
            <input type="number" value={form.average_score ?? ""} onChange={(e) => update("average_score", e.target.value ? Number(e.target.value) : null)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>ベストスコア</span>
            <input type="number" value={form.best_score ?? ""} onChange={(e) => update("best_score", e.target.value ? Number(e.target.value) : null)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>ホームコース</span>
            <input value={form.home_course} onChange={(e) => update("home_course", e.target.value)} placeholder="" className={inputClass} />
          </div>
        </div>

        {/* SNS */}
        <h3 className="px-1 pt-2 text-lg font-bold text-white">SNS</h3>
        <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>Instagram</span>
            <input value={form.sns_instagram} onChange={(e) => setForm((p) => ({ ...p, sns_instagram: e.target.value }))} placeholder="https://instagram.com/..." className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>X</span>
            <input value={form.sns_x} onChange={(e) => setForm((p) => ({ ...p, sns_x: e.target.value }))} placeholder="https://x.com/..." className={inputClass} />
          </div>
        </div>

        {/* Custom links */}
        <h3 className="px-1 pt-2 text-lg font-bold text-white">その他のリンク</h3>
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3">
          {form.custom_links.map((link, i) => (
            <div key={i} className={`flex gap-2 items-start pb-2 ${i < form.custom_links.length - 1 ? "border-b border-[#ececec] mb-2" : ""}`}>
              <div className="flex flex-col gap-1 shrink-0 mt-1">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => {
                    const next = [...form.custom_links];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    setForm((p) => ({ ...p, custom_links: next }));
                  }}
                  className="p-0.5 text-[#8b8b8b] disabled:opacity-20"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={i === form.custom_links.length - 1}
                  onClick={() => {
                    const next = [...form.custom_links];
                    [next[i], next[i + 1]] = [next[i + 1], next[i]];
                    setForm((p) => ({ ...p, custom_links: next }));
                  }}
                  className="p-0.5 text-[#8b8b8b] disabled:opacity-20"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <input
                  value={link.label}
                  onChange={(e) => {
                    const next = [...form.custom_links];
                    next[i] = { ...next[i], label: e.target.value };
                    setForm((p) => ({ ...p, custom_links: next }));
                  }}
                  placeholder="ラベル（例: ブログ）"
                  className={inputClass}
                />
                <input
                  value={link.url}
                  onChange={(e) => {
                    const next = [...form.custom_links];
                    next[i] = { ...next[i], url: e.target.value };
                    setForm((p) => ({ ...p, custom_links: next }));
                  }}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, custom_links: p.custom_links.filter((_, j) => j !== i) }))}
                className="shrink-0 p-2 text-[#8b8b8b] mt-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setForm((p) => ({ ...p, custom_links: [...p.custom_links, { label: "", url: "" }] }))}
            className="flex items-center gap-1 text-sm font-bold text-[#006728] pt-1"
          >
            <Plus className="h-4 w-4" />
            リンクを追加
          </button>
        </div>

        {/* Save */}
        <div className="flex flex-col items-center gap-2 px-6 pt-4 pb-2">
          <button onClick={handleSave} disabled={isSaving} className="w-full max-w-xs rounded-full bg-white py-2.5 text-base font-bold text-[#006728] disabled:opacity-50">
            {isSaving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
