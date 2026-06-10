"use client";

import { useState, useEffect } from "react";
import { Check, Copy, Loader2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, updateProfile, setUsername as setUsernameApi } from "@/hooks/use-profile";
import { Loading } from "@/components/loading";

const inputClass = "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

const VISIBLE_FIELD_LABELS: Record<string, string> = {
  nickname: "ニックネーム",
  golf_start_date: "ゴルフ歴",
  average_score: "平均スコア",
  best_score: "ベストスコア",
  home_course: "ホームコース",
  bio: "ひとこと",
  bag: "MY BAG",
  favorite_courses: "お気に入りコース",
  sns_links: "SNSリンク",
};

export default function ShareSettingsPage() {
  const { user } = useAuth();
  const { profile, isLoading, refetch } = useProfile();
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.username) setUsername(profile.username);
  }, [profile]);

  if (!user) return null;
  if (isLoading) return <Loading />;

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
    } catch (err: any) {
      setUsernameError(err.message);
    } finally {
      setIsSavingUsername(false);
    }
  }

  async function handleTogglePublic() {
    try {
      await updateProfile({ is_public: !profile?.is_public });
      refetch();
    } catch (err: any) {
      alert(err.message);
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
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShowQR() {
    if (!profileUrl) return;
    const QRCode = (await import("qrcode")).default;
    const url = await QRCode.toDataURL(profileUrl, {
      width: 256,
      margin: 2,
      color: { dark: "#006728", light: "#ffffff" },
    });
    setQrUrl(url);
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="名刺・共有設定" variant="dark" />

        {/* Username */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">ユーザー名</h3>
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3">
          <p className="text-xs text-[#8b8b8b]">公開ページのURLに使われます（英数字・ハイフン・アンダースコア、3〜20文字）</p>
          {hasUsername && !isEditingUsername ? (
            <>
              <div className="flex gap-2 items-center">
                <input value={profile.username!} disabled className={`${inputClass} bg-[#f5f5f5] text-[#8b8b8b]`} />
                <button
                  onClick={() => setIsEditingUsername(true)}
                  className="shrink-0 rounded-lg border border-[#006728] px-4 py-2 text-sm font-bold text-[#006728]"
                >
                  変更する
                </button>
              </div>
              <p className="text-xs text-[#8b8b8b]">URL: waggly.jp/p/{profile.username}</p>
            </>
          ) : (
            <>
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
            </>
          )}
          {usernameError && <p className="text-xs text-red-500">{usernameError}</p>}
        </div>

        {/* Public toggle */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">公開設定</h3>
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
        </div>

        {/* Visible fields */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">公開する項目</h3>
        <div className="flex flex-col rounded-lg bg-white p-3">
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

        {/* Share */}
        {profileUrl && profile?.is_public && (
          <>
            <h3 className="px-1 pt-2 text-base font-bold text-white">シェア</h3>
            <div className="flex flex-col gap-3 rounded-lg bg-white p-3">
              <a href={profileUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-[#006728] text-sm font-bold">
                <ExternalLink className="h-4 w-4" />
                プレビューを見る
              </a>
              <button onClick={handleCopy} className="flex items-center gap-2 rounded-full border border-[#006728] px-4 py-2 text-sm font-bold text-[#006728]">
                {copied ? <><Check className="h-4 w-4" /> コピーしました</> : <><Copy className="h-4 w-4" /> リンクをコピー</>}
              </button>
              <button onClick={handleShowQR} className="flex items-center gap-2 rounded-full bg-[#006728] px-4 py-2 text-sm font-bold text-white justify-center">
                QRコードを表示
              </button>
              {qrUrl && (
                <div className="flex flex-col items-center gap-2 pt-2">
                  <img src={qrUrl} alt="QR Code" className="h-48 w-48" />
                  <a href={qrUrl} download="waggly-qr.png" className="text-sm text-[#006728] font-bold">画像をダウンロード</a>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
