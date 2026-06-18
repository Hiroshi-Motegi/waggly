"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Copy, Loader2, ExternalLink, Share2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, updateProfile, setUsername as setUsernameApi } from "@/hooks/use-profile";
import { Loading } from "@/components/loading";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";

const inputClass = "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

const VISIBLE_FIELD_LABELS: Record<string, string> = {
  cover_images: "カバー画像",
  nickname: "ニックネーム",
  bio: "ひとこと",
  sns_links: "SNS",
  custom_links: "その他のリンク",
  golf_start_date: "ゴルフ歴",
  average_score: "平均スコア",
  best_score: "ベストスコア",
  home_course: "ホームコース",
  bag: "クラブ",
  items: "アイテム",
  favorite_courses: "お気に入りコース",
};

export default function ShareSettingsPage() {
  const { user } = useAuth();
  const { profile, isLoading, refetch } = useProfile();
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.username) setUsername(profile.username);
  }, [profile]);

  // Auto-generate QR code when username is set
  useEffect(() => {
    if (!profile?.username) return;
    const url = `https://waggly.jp/p/${profile.username}`;
    import("qrcode").then((mod) =>
      mod.default.toDataURL(url, {
        width: 256,
        margin: 2,
        color: { dark: "#006728", light: "#ffffff" },
      })
    ).then(setQrUrl);
  }, [profile?.username]);

  if (!user) return null;
  if (isLoading) return <Loading variant="light" />;

  const profileUrl = profile?.username ? `https://waggly.jp/p/${profile.username}` : null;

  const hasUsername = !!profile?.username;

  async function handleSaveUsername() {
    if (hasUsername && username !== profile?.username) {
      if (!confirm("ユーザー名を変更するとURLが変わります。旧URLは無効になりますがよろしいですか？")) return;
    }
    setUsernameError("");
    setIsSavingUsername(true);
    try {
      await setUsernameApi(username);
      setIsEditingUsername(false);
      refetch();
    } catch (err: unknown) {
      setUsernameError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSavingUsername(false);
    }
  }

  async function handleTogglePublic() {
    try {
      await updateProfile({ is_public: !profile?.is_public });
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    }
  }

  async function toggleField(field: string) {
    const current = profile?.visible_fields ?? {};
    const updated = { ...current, [field]: current[field] === false ? true : false };
    await updateProfile({ visible_fields: updated });
    refetch();
  }

  function handleCopy() {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    import("@/lib/gtm").then(({ trackEvent }) => trackEvent("profile_shared", { method: "copy" }));
  }


  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      {isSavingUsername && <ProcessingOverlay />}
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="名刺・共有設定" variant="dark" />

        {/* QR Card (public only) */}
        {profile?.username && profile?.is_public && qrUrl && (
          <div className="flex flex-col items-center gap-3 rounded-lg bg-white pt-8 pb-1 px-3">
            <img src={qrUrl} alt="QR Code" className="h-32 w-32" />
            <p className="text-sm font-bold text-[#006728]">waggly.jp/p/{profile.username}</p>
            <a href={`/p/${profile.username}?preview=1`} target="_blank" rel="noopener" className="flex items-center justify-center gap-1 rounded-full border border-[#006728] px-4 py-1.5 text-xs font-bold text-[#006728]">
              <ExternalLink className="h-3 w-3" />
              ページを表示
            </a>
            {/* Action buttons */}
            <div className="flex items-center w-full pt-3 pb-1">
              <a href={qrUrl} download="waggly-qr.png" className="flex flex-1 flex-col items-center gap-2 py-4">
                <img src="/icons/share-qr-save.svg" alt="" className="h-5 w-5" />
                <span className="text-xs font-bold text-[#006728]">QR保存</span>
              </a>
              <div className="w-px self-stretch bg-[#ddd]" />
              <button onClick={handleCopy} className="flex flex-1 flex-col items-center gap-2 py-4">
                <img src="/icons/share-url-copy.svg" alt="" className="h-5 w-5" />
                <span className="text-xs font-bold text-[#006728]">{copied ? "コピー済み" : "URLをコピー"}</span>
              </button>
              <div className="w-px self-stretch bg-[#ddd]" />
              <button
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share) {
                    navigator.share({
                      title: `${profile.nickname || profile.username}のゴルファー名刺`,
                      url: `https://waggly.jp/p/${profile.username}`,
                    });
                    import("@/lib/gtm").then(({ trackEvent }) => trackEvent("profile_shared", { method: "native_share" }));
                  } else {
                    handleCopy();
                  }
                }}
                className="flex flex-1 flex-col items-center gap-2 py-4"
              >
                <img src="/icons/share-share.svg" alt="" className="h-5 w-5" />
                <span className="text-xs font-bold text-[#006728]">シェア</span>
              </button>
            </div>
          </div>
        )}

        {/* Username */}
        <h3 className="px-1 pt-2 text-lg font-bold text-white">ユーザー名</h3>
        {hasUsername && !isEditingUsername ? (
          <div className="flex items-center gap-2 rounded-lg bg-white p-3">
            <span className="flex-1 text-sm text-[#222] truncate">URL : waggly.jp/p/{profile.username}</span>
            <button
              onClick={() => setIsEditingUsername(true)}
              className="shrink-0 rounded-lg border border-[#006728] px-3 py-1.5 text-sm font-bold text-[#006728]"
            >
              変更する
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg bg-white p-3">
            <p className="text-sm text-[#8b8b8b]">公開ページのURLに使われます（英数字・ハイフン・アンダースコア、3〜20文字）</p>
            <div className="flex gap-2">
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className={inputClass} />
              <button
                onClick={handleSaveUsername}
                disabled={isSavingUsername || !username || username === profile?.username}
                className="shrink-0 rounded-lg bg-[#006728] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {isSavingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : "設定"}
              </button>
            </div>
            {hasUsername && (
              <button onClick={() => { setIsEditingUsername(false); setUsername(profile!.username!); setUsernameError(""); }} className="text-sm text-[#8b8b8b]">
                キャンセル
              </button>
            )}
            {usernameError && <p className="text-sm text-red-500">{usernameError}</p>}
          </div>
        )}

        {/* Public toggle */}
        <h3 className="px-1 pt-2 text-lg font-bold text-white">公開設定</h3>
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-base">名刺を公開する</span>
            <button
              onClick={handleTogglePublic}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                profile?.is_public ? "bg-[#006728]" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                profile?.is_public ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
          {!profile?.username && (
            <p className="text-xs text-amber-600">公開するにはユーザー名を先に設定してください</p>
          )}
          {profile?.username && !profile?.is_public && (
            <a href={`/p/${profile.username}?preview=1`} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 text-[#006728] text-sm font-bold pt-3">
              <ExternalLink className="h-4 w-4" />
              プレビューで確認する
            </a>
          )}
        </div>

        {/* Visible fields */}
        <h3 className="px-1 pt-2 text-lg font-bold text-white">公開する項目</h3>
        <div className="flex flex-col rounded-lg bg-white p-3">
          <p className="text-sm text-[#8b8b8b] pb-2">設定はリアルタイムで反映されます</p>
          {Object.entries(VISIBLE_FIELD_LABELS).map(([field, label]) => {
            const visible = profile?.visible_fields?.[field] !== false;
            return (
              <div key={field} className="flex items-center justify-between py-2.5 border-b border-[#ececec] last:border-0">
                <span className="text-base">{label}</span>
                <button
                  onClick={() => toggleField(field)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    visible ? "bg-[#006728]" : "bg-gray-300"
                  }`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    visible ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            );
          })}
        </div>


      </div>
    </div>
  );
}
