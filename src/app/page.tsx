import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { LoginButtons } from "@/components/home/login-buttons";
import { FeatureSection } from "@/components/home/feature-section";
import { FloatingCta } from "@/components/home/landing-cta";
import { PublicFooter } from "@/components/public-footer";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return <HomeDashboard />;
  }

  /* ─── Landing Page (Server-Rendered for SEO) ─── */
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

        {/* Login (top) */}
        <div id="login-top" className="w-full">
          <div className="bg-black/30 px-8 py-6">
            <p className="text-center text-base font-bold text-white mb-4">ログイン・新規登録<span className="inline-flex items-center bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mx-1.5 -translate-y-px">無料</span>はこちらから</p>
            <LoginButtons />
          </div>
        </div>

        {/* Section title */}
        <p className="text-2xl font-bold text-white tracking-wider text-center mb-2 mt-10">ワグリーでできること</p>
        <p className="text-sm text-white/70 text-center mb-8">基本的な機能は会員登録だけで利用できます。</p>

        {/* Feature 1: クラブ管理 */}
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

        {/* Feature 2: アイテム管理 */}
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

        {/* Feature 3: ゴルファー名刺 */}
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
          <a href="https://waggly.jp/p/waglin" target="_blank" rel="noopener" className="mt-4 flex h-12 w-full max-w-64 mx-auto items-center justify-center gap-2 rounded-full border border-white bg-black/30 text-white text-base font-medium">
            名刺のサンプルを見てみる
          </a>
        </div>

        {/* Feature 4: 練習管理 */}
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

        {/* Feature 5: AIに相談 */}
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
        <div id="login-bottom" className="w-full">
          <div className="bg-black/30 px-8 py-6">
            <p className="text-center text-base font-bold text-white mb-4">ログイン・新規登録<span className="inline-flex items-center bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mx-1.5 -translate-y-px">無料</span>はこちらから</p>
            <LoginButtons />
          </div>
        </div>

        <PublicFooter />
      </div>

      {/* Floating CTA */}
      <FloatingCta />
    </div>
  );
}
