"use client";

import { useState, useRef, useEffect } from "react";
import { Loading } from "@/components/loading";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePracticeSessions } from "@/hooks/use-practice";
import { useProfile, useFavoriteCourses } from "@/hooks/use-profile";
import { isNative } from "@/lib/platform";
import { RecentPractice } from "@/components/home/recent-practice";
import { AdBanner } from "@/components/ad-banner";
import { PublicFooter } from "@/components/public-footer";

const featureCards = [
  {
    href: "/bag",
    icon: "/icons/my-bag.svg",
    label: "マイバッグ",
  },
  {
    href: "/items",
    icon: "/icons/items.svg",
    label: "アイテム",
  },
  {
    href: "/courses",
    icon: "/icons/golf-course.svg",
    label: "ゴルフ場を探す",
    sub: "楽天GORA",
  },
  {
    href: "/coach/plans",
    icon: "/icons/practice-menu.svg",
    label: "練習メニュー",
    sub: "AIに練習メニューを相談",
  },
  {
    href: "/practice",
    icon: "/icons/nav-practice-g.svg",
    label: "練習記録",
  },
  {
    href: "/settings",
    icon: "/icons/settings.svg",
    label: "設定",
  },
];

/* ─── Login buttons (shared between hero & CTA) ─── */
const LINE_ICON = (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
  </svg>
);
const GOOGLE_ICON = (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);
function loginLine() {
  const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth/line/callback`);
  const state = crypto.randomUUID();
  sessionStorage.setItem("line_oauth_state", state);
  window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${redirectUri}&state=${state}&scope=openid%20profile`;
}
async function loginGoogle() {
  localStorage.setItem("login_method", "google");
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
  });
}
function LoginButtons() {
  return (
    <>
      <button onClick={loginLine} className="flex h-12 w-full max-w-64 mx-auto items-center justify-center gap-2.5 rounded-full bg-[#06C755] text-white font-bold text-base shadow-lg">
        {LINE_ICON} LINEでログイン
      </button>
      <button onClick={loginGoogle} className="mt-3 flex h-12 w-full max-w-64 mx-auto items-center justify-center gap-2.5 rounded-full bg-white text-gray-800 font-bold text-base shadow-lg">
        {GOOGLE_ICON} Googleでログイン
      </button>
      {process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true" && (
        <button onClick={() => { localStorage.removeItem("dev-logged-in"); window.location.reload(); }} className="mt-3 flex h-12 w-full max-w-64 mx-auto items-center justify-center rounded-full border border-white/30 text-white/70 font-bold text-base">
          開発ログイン
        </button>
      )}
    </>
  );
}

/* ─── Feature section with accordion ─── */
function FeatureSection({ icon, title, photo, photoSide, screenshots, description, note, details }: {
  icon: string;
  title: string;
  photo: string;
  photoSide: "left" | "right";
  screenshots: { src: string; alt: string }[];
  description: string;
  note?: string;
  details: { heading: string; src: string; text: string }[];
}) {
  const [open, setOpen] = useState(false);
  const isRight = photoSide === "right";
  return (
    <div className="w-full mb-10">
      {/* Key visual: photo with screenshots overlaid, clipped at photo bottom */}
      <div className={`relative ${isRight ? "ml-5 rounded-l-2xl" : "mr-5 rounded-r-2xl"} overflow-hidden h-[254px]`}>
        <img src={photo} alt={title} className="w-full h-full object-cover" />
        {/* Screenshots — overlaid on photo, first image larger+front, second behind+offset down */}
        <div className={`absolute top-[30px] ${isRight ? "right-[10px]" : "left-[10px]"}`}>
          <div className="relative flex items-start">
            {screenshots.length === 1 ? (
              <div className="w-[130px] overflow-hidden shadow-xl rounded-md">
                <img src={screenshots[0].src} alt={screenshots[0].alt} className="w-full" />
              </div>
            ) : (
              <>
                <div className="w-[120px] overflow-hidden shadow-xl rounded-md relative z-0">
                  <img src={screenshots[0].src} alt={screenshots[0].alt} className="w-full" />
                </div>
                <div className="w-[140px] overflow-hidden shadow-xl rounded-md relative z-10 -ml-4 mt-3">
                  <img src={screenshots[1].src} alt={screenshots[1].alt} className="w-full" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Title badge — overlapping bottom of photo */}
      <div className={`flex items-center -mt-5 relative z-20 ${isRight ? "justify-end mr-5" : "ml-5"}`}>
        <span className="inline-flex items-center gap-3 bg-[#00441b] px-5 py-2">
          <Image src={icon} alt="" width={24} height={34} />
          <span className="text-lg font-bold text-white">{title}</span>
        </span>
      </div>

      {/* Description */}
      <p className="text-base text-white leading-relaxed mt-4 mx-5">{description}</p>
      {note && <p className="text-xs text-white/60 leading-relaxed mt-2 mx-5">{note}</p>}

      {/* Accordion */}
      {!open && (
        <button onClick={() => setOpen(true)} className="mt-4 flex h-12 w-full max-w-64 mx-auto items-center justify-center gap-2 rounded-full border border-white bg-black/30 text-white text-base font-medium">
          詳しく見る <ChevronDown className="h-4 w-4" />
        </button>
      )}
      {open && (
        <>
          <div className="mt-4 mx-5 space-y-6 animate-fade-in">
            {details.map((d, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-[138px] shrink-0 border border-white overflow-hidden">
                  <img src={d.src} alt={d.heading} className="w-full" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-white mb-2 border-b border-white pb-2">{d.heading}</p>
                  <p className="text-base text-white/70 leading-relaxed">{d.text}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setOpen(false)} className="mx-5 mt-4 flex h-11 w-[calc(100%-40px)] items-center justify-center gap-2 rounded-full border border-white bg-black/30 text-white text-base font-medium">
            閉じる <ChevronUp className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

/* ─── Landing Page ─── */
function LandingPage() {
  const topLoginRef = useRef<HTMLDivElement>(null);
  const bottomLoginRef = useRef<HTMLDivElement>(null);
  const [showFloatingCta, setShowFloatingCta] = useState(false);

  useEffect(() => {
    const topEl = topLoginRef.current;
    const bottomEl = bottomLoginRef.current;
    if (!topEl || !bottomEl) return;
    let topVisible = true;
    let bottomVisible = false;
    const update = () => setShowFloatingCta(!topVisible && !bottomVisible);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === topEl) topVisible = entry.isIntersecting;
          if (entry.target === bottomEl) bottomVisible = entry.isIntersecting;
        }
        update();
      },
      { threshold: 0 }
    );
    observer.observe(topEl);
    observer.observe(bottomEl);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative flex flex-col" style={{ minHeight: "100dvh" }}>
      <div className="relative z-10 flex flex-col items-center w-full">

        {/* Hero */}
        <div className="flex flex-col items-center px-8 pt-16 pb-4 w-full max-w-sm">
          <Image src="/images/witb-waggly-text.png" alt="Waggly" width={187} height={60} priority />
          <p className="mt-3 text-lg text-white font-bold tracking-wider text-center">ゴルフギアの管理をこれ一つで</p>
          <p className="mt-3 text-sm text-white/70 text-center leading-relaxed">
            ワグリーは、ゴルファーのためのギア管理アプリです。クラブやアイテムの管理、練習記録、AIコーチへの相談まで、ゴルフライフをまとめてサポートします。
          </p>
        </div>

        {/* Home image */}
        <div className="flex justify-center">
          <div className="relative border-2 border-b-0 border-white">
            <Image src="/images/lp/home-image.png" alt="" width={252} height={323} />
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        </div>

        {/* Login */}
        <div ref={topLoginRef} className="w-full">
          <div className="bg-black/30 px-8 py-6">
            <p className="text-center text-base font-bold text-white mb-4">ログイン・新規登録<span className="inline-flex items-center bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mx-1.5 -translate-y-px">無料</span>はこちらから</p>
            <LoginButtons />
          </div>
        </div>

        {/* Section title */}
        <p className="text-2xl font-bold text-white tracking-wider text-center mb-2 mt-10">ワグリーでできること</p>
        <p className="text-sm text-white/70 text-center mb-8">基本的な機能は会員登録だけで利用できます。</p>

        {/* Feature 1: クラブ管理 — photo right-flush */}
        <FeatureSection
          icon="/icons/nav-bag-w.svg"
          title="クラブ管理"
          photo="/images/lp/club-photo.jpg"
          photoSide="right"
          screenshots={[
            { src: "/images/lp/ss-club-list.png", alt: "クラブ一覧" },
            { src: "/images/lp/ss-club-detail.png", alt: "クラブ詳細" },
          ]}
          description="お使いのクラブを登録して、自分だけのセッティングを一覧管理。スペックやメモも詳しく記録できます。"
          details={[
            { heading: "クラブの詳細を登録可能", src: "/images/lp/ss-club-detail.png", text: "ロフト角、ライ角、シャフト、フレックスなどのスペックを細かく登録できます。購入日や購入店舗、価格も記録できるので、買い替え時の比較や資産管理にも役立ちます。" },
            { heading: "バッグの中身を一覧表示", src: "/images/lp/ss-club-list.png", text: "14本のセッティングをひと目で確認。クラブごとにメモやメンテナンス記録を残せるので、グリップ交換やシャフト変更の履歴もしっかり管理できます。予備バッグや予備クラブの管理も可能です。" },
          ]}
        />

        {/* Feature 2: アイテム管理 — photo left-flush */}
        <FeatureSection
          icon="/icons/nav-items-w.svg"
          title="アイテム管理"
          photo="/images/lp/item-photo.jpg"
          photoSide="left"
          screenshots={[
            { src: "/images/lp/ss-item.png", alt: "アイテム一覧" },
          ]}
          description="グローブ、シューズ、レインウェアなどクラブ以外のゴルフアイテムもまとめて管理できます。"
          details={[
            { heading: "アイテムをカテゴリ別に管理", src: "/images/lp/ss-item.png", text: "グローブ、シューズ、レインウェア、距離計など、カテゴリ別にアイテムを整理。写真付きで登録できるので持ち物の把握がかんたんです。購入日や価格も記録して、買い替え時期の目安にも。購入元URLを登録することで、すぐに購入ページに遷移できます。" },
          ]}
        />

        {/* Feature 3: ゴルファー名刺 — photo right-flush, link instead of accordion */}
        <div className="w-full mb-10">
          <div className="relative ml-5 rounded-l-2xl overflow-hidden h-[254px]">
            <img src="/images/lp/card-photo.jpg" alt="ゴルファー名刺" className="w-full h-full object-cover" />
            <div className="absolute top-[20px] right-[10px]">
              <div className="w-[160px] shadow-xl rounded-md">
                <img src="/images/lp/ss-card.png" alt="名刺サンプル" className="w-full rounded-md" />
              </div>
            </div>
          </div>
          <div className="flex items-center -mt-5 relative z-20 justify-end mr-5">
            <span className="inline-flex items-center gap-3 bg-[#00441b] px-5 py-2">
              <Image src="/icons/business-card-w.svg" alt="" width={24} height={24} />
              <span className="text-lg font-bold text-white">ゴルファー名刺</span>
            </span>
          </div>
          <p className="text-base text-white leading-relaxed mt-4 mx-5">
            あなたのゴルフプロフィールをWeb名刺として公開。クラブセッティングやスコア、SNSリンクをまとめて共有できます。
          </p>
          <a href="https://waggly.jp/p/waglin" target="_blank" rel="noopener" className="mx-5 mt-4 flex h-11 w-[calc(100%-40px)] items-center justify-center gap-2 rounded-full border border-white bg-black/30 text-white text-base font-medium">
            名刺のサンプルを見てみる
          </a>
        </div>

        {/* Feature 4: 練習管理 — photo left-flush */}
        <FeatureSection
          icon="/icons/nav-practice-w.svg"
          title="練習管理"
          photo="/images/lp/practice-photo.jpg"
          photoSide="left"
          screenshots={[
            { src: "/images/lp/ss-practice1.png", alt: "練習カレンダー" },
            { src: "/images/lp/ss-practice2.png", alt: "練習詳細" },
          ]}
          description="日々の練習を記録して上達の軌跡を振り返ろう。打球数やメモを残してモチベーション維持に。"
          details={[
            { heading: "カレンダーで振り返り", src: "/images/lp/ss-practice1.png", text: "練習した日がカレンダーにマークされ、月間の練習頻度がひと目でわかります。「今月は何回練習したか」が見えるので、継続のモチベーション維持に効果的です。" },
            { heading: "詳細な練習ログ", src: "/images/lp/ss-practice2.png", text: "クラブ別の打球数、場所、メモを記録。ドライバー何球、アイアン何球と細かく残せるので、自分の練習傾向を把握して上達に繋げられます。" },
          ]}
        />

        {/* Feature 5: AIに相談 — photo right-flush */}
        <FeatureSection
          icon="/images/witb-ball-logo.png"
          title="AIに相談"
          photo="/images/lp/ai-photo.jpg"
          photoSide="right"
          screenshots={[
            { src: "/images/lp/ss-ai-menu.png", alt: "AI練習メニュー" },
            { src: "/images/lp/ss-ai-chat.png", alt: "AIチャット" },
          ]}
          description="AIがあなたのゴルフをサポート。練習メニューの自動作成や、スイングの悩み相談まで、いつでも気軽に頼れるコーチです。"
          note="※ AI機能は無料の場合、練習メニュー3回/月、チャットは5回/月の制限があります。Pro版（480円/月）のご契約で上限が大きくなります。"
          details={[
            { heading: "AIで練習メニューを構築", src: "/images/lp/ss-ai-menu.png", text: "練習したいクラブや時間、場所を選ぶだけで、AIがあなた専用の練習メニューを自動作成。過去の練習記録も参考にしながら、具体的な練習内容を提案します。" },
            { heading: "AIチャットで相談", src: "/images/lp/ss-ai-chat.png", text: "スイングの悩み、クラブ選び、コース攻略など、気軽にAIコーチに相談できます。あなたの登録データをもとに、パーソナライズされたアドバイスが返ってきます。" },
          ]}
        />

        {/* Guide */}
        <div className="w-full bg-black/10">
          <div className="px-4 py-4 flex items-center justify-between">
            <p className="text-lg font-bold text-white tracking-wider">ご利用ガイド</p>
            <Link href="/help" className="rounded-full border border-white px-3 py-0.5 text-sm font-bold text-white">すべて見る</Link>
          </div>
          {[
            { href: "/help/account-linking", label: "アカウント連携について" },
            { href: "/help/plans", label: "プランについて" },
            { href: "/help/ads", label: "広告表示について" },
          ].map((item, i, arr) => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-2.5 px-3 py-4 ${i < arr.length - 1 ? "border-b border-[#dfdfdf]/30" : ""}`}>
              <span className="flex-1 text-base text-white">{item.label}</span>
              <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60 invert" />
            </Link>
          ))}
        </div>

        {/* Login (bottom) */}
        <div ref={bottomLoginRef} className="w-full">
          <div className="bg-black/30 px-8 py-6">
            <p className="text-center text-base font-bold text-white mb-4">ログイン・新規登録<span className="inline-flex items-center bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mx-1.5 -translate-y-px">無料</span>はこちらから</p>
            <LoginButtons />
          </div>
        </div>

        <PublicFooter />
      </div>

      {/* Floating CTA */}
      <button
        onClick={() => bottomLoginRef.current?.scrollIntoView({ behavior: "smooth" })}
        className={`fixed bottom-6 right-0 z-30 rounded-l-full bg-[#00441b] border-2 border-r-0 border-white pl-6 pr-3 py-3.5 text-white font-bold text-sm shadow-lg transition-all duration-300 ${showFloatingCta ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"}`}
      >
        無料でアカウント作成
      </button>
    </div>
  );
}

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { courses: favCourses } = useFavoriteCourses();
  const { sessions } = usePracticeSessions();
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const forceGuest = searchParams.get("guest") !== null;

  if (authLoading && !forceGuest) {
    return <Loading variant="light" />;
  }

  if (forceGuest || (!user && !isNative())) {
    return <LandingPage />;
  }

  return (
    <div className="relative" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative flex flex-col px-2 pt-2 pb-4">
        {/* Logo */}
        <div className="flex items-center justify-center w-full relative h-14">
          <Image
            src="/icons/waggly-logo-white.svg"
            alt="Waggly"
            width={151}
            height={46}
            priority
          />
          <Link href="/settings" className="absolute right-2">
            {profileLoading ? (
              <div className="h-10 w-10 rounded-full bg-white/20 border-2 border-white/60" />
            ) : (profile?.avatar_url ?? user?.avatar_url) ? (
              <img src={profile?.avatar_url ?? user?.avatar_url ?? ""} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white/60" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/30 border-2 border-white/60 flex items-center justify-center text-white text-base font-bold">
                {(profile?.nickname ?? user?.display_name)?.[0] ?? "G"}
              </div>
            )}
          </Link>
        </div>

        {/* Greeting */}
        <p className="text-lg font-medium text-white text-center mt-2">
          {(() => { const h = new Date().getHours(); return h >= 18 || h < 4 ? "こんばんは" : "こんにちは"; })()}{user && !profileLoading ? `、${profile?.nickname || user.display_name}さん` : ""}
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-2 w-full mt-4">
          {featureCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <div className="flex flex-col items-center justify-center gap-[5px] rounded-lg border border-[#72937f] bg-white p-5 h-[121px] drop-shadow-[2px_2px_0px_#72937f]">
                <Image src={card.icon} alt={card.label} width={48} height={48} />
                <div className="flex flex-col items-center gap-[2px] text-center">
                  <span className="text-base font-bold text-[#006728]">{card.label}</span>
                  {card.sub && (
                    <span className="text-xs text-[#717171]">{card.sub}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 広告バナー */}
        <div className="mt-4">
          <AdBanner slot="HOME_TOP" />
        </div>

        {/* Recent practice */}
        <div className="flex items-center px-1 mt-4 mb-2">
          <h3 className="flex-1 text-lg font-bold text-white">最近の練習記録</h3>
          <Link href="/practice" className="rounded-full border border-white px-3 py-0.5 text-sm font-bold text-white">すべて見る</Link>
        </div>
        <RecentPractice sessions={sessions} />

        {/* Favorite courses */}
        <div className="flex items-center px-1 mt-4 mb-2">
          <h3 className="flex-1 text-lg font-bold text-white">お気に入りコース</h3>
          <Link href="/courses/favorites" className="rounded-full border border-white px-3 py-0.5 text-sm font-bold text-white">すべて見る</Link>
        </div>
        <div className="rounded-lg bg-white p-3">
          {favCourses.length > 0 ? (
            favCourses.map((c, i) => {
              const goraUrl = c.gora_course_id
                ? `https://hb.afl.rakuten.co.jp/hgc/${process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID ?? ""}/?pc=${encodeURIComponent(`https://search.gora.golf.rakuten.co.jp/cal/disp/c_id/${c.gora_course_id}/`)}`
                : null;
              return (
                <a key={c.id} href={goraUrl ?? "#"} target={goraUrl ? "_blank" : undefined} rel="noopener" className={`flex items-center gap-2.5 py-2 ${i < favCourses.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                  {c.course_image_url && (
                    <img src={c.course_image_url} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold truncate">{c.course_name}</p>
                    {c.address && <p className="text-sm text-[#8b8b8b] truncate">{c.address}</p>}
                  </div>
                  {c.evaluation != null && (
                    <span className="text-xs text-amber-500 shrink-0">★{c.evaluation.toFixed(1)}</span>
                  )}
                </a>
              );
            })
          ) : (
            <div className="flex flex-col items-center px-4 py-2 gap-3">
              <p className="text-sm text-[#8b8b8b]">お気に入りはありません。</p>
              <Link href="/courses" className="w-full text-center text-sm font-bold text-[#006728] border border-[#006728] rounded-full py-2">お気に入りコースを登録する</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

