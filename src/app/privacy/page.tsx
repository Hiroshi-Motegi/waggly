"use client";

import { PublicPageLayout } from "@/components/layout/public-page-layout";

export default function PrivacyPage() {
  return (
    <PublicPageLayout title="プライバシーポリシー">
      <div className="rounded-lg bg-white p-4 space-y-5 leading-relaxed">
        <p className="text-sm text-[#8b8b8b]">最終更新日: 2026年6月15日</p>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">1. 個人情報の取得</h3>
          <p className="text-base">本サービス「Waggly」（以下「当サービス」）は、以下の個人情報を取得します。</p>
          <ul className="list-disc pl-5 space-y-0.5 text-base">
            <li>LINEアカウント情報（ユーザーID、表示名、プロフィール画像URL）</li>
            <li>Googleアカウント情報（ユーザーID、表示名、プロフィール画像URL、メールアドレス）</li>
            <li>ゴルフクラブ・アイテムの登録情報</li>
            <li>練習記録データ</li>
            <li>AIコーチとの会話履歴</li>
            <li>アップロードされた画像</li>
          </ul>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">2. 利用目的</h3>
          <p className="text-base">取得した個人情報は、以下の目的で利用します。</p>
          <ul className="list-disc pl-5 space-y-0.5 text-base">
            <li>ユーザー認証およびアカウント管理</li>
            <li>クラブ管理・練習記録・AIコーチ等のサービス機能の提供</li>
            <li>サービスの改善・新機能の開発</li>
            <li>利用状況の分析（匿名化・統計化した上で）</li>
            <li>お問い合わせへの対応</li>
          </ul>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">3. 外部サービスへのデータ送信</h3>
          <p className="text-base">当サービスでは、機能提供のために以下の外部サービスにデータを送信します。</p>
          <ul className="list-disc pl-5 space-y-0.5 text-base">
            <li><strong>LINE SDK</strong> - ユーザー認証</li>
            <li><strong>Google OAuth</strong> - ユーザー認証</li>
            <li><strong>Anthropic API（Claude）</strong> - AIコーチ機能の提供（会話内容を送信）</li>
            <li><strong>Supabase</strong> - データの保存・管理</li>
            <li><strong>Pay.jp</strong> - 決済処理（クレジットカード情報はPay.jp社が管理し、当サービスのサーバーには保存されません）</li>
            <li><strong>Google AdSense</strong> - 広告の配信（Cookieを使用してユーザーの興味に基づいた広告を表示する場合があります）</li>
            <li><strong>Google アナリティクス</strong> - アクセス解析（Cookieを使用してサイトの利用状況を収集します。データは匿名化されます）</li>
            <li><strong>楽天GORA API</strong> - ゴルフ場検索機能の提供</li>
            <li><strong>Vercel</strong> - サービスのホスティング・アクセスログ</li>
          </ul>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">4. 第三者提供</h3>
          <p className="text-base">法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。ただし、前項に記載の外部サービスへの送信は、サービス提供に必要な範囲で行います。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">5. データの保管</h3>
          <p className="text-base">個人情報は、Supabase（クラウドデータベース）上に暗号化して保管します。アップロードされた画像は、Supabase Storageに保管します。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">6. データの開示・訂正・削除</h3>
          <p className="text-base">ユーザーは、自身の個人情報の開示・訂正・削除を求めることができます。アプリ内の設定画面から自身のデータを管理できるほか、お問い合わせにより対応します。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">7. Cookie・アクセス解析・広告</h3>
          <p className="text-base">当サービスでは以下の目的でCookieを使用します。</p>
          <ul className="list-disc pl-5 space-y-0.5 text-base">
            <li><strong>ログイン状態の維持</strong> - セッション管理に必要なCookie</li>
            <li><strong>Google アナリティクス</strong> - サービス改善のためのアクセス解析。収集されるデータは統計的に処理され、個人を特定するものではありません</li>
            <li><strong>Google AdSense</strong> - 広告配信のためのCookie。ユーザーの興味・関心に基づいた広告が表示される場合があります。広告のパーソナライズはGoogleの設定（<a href="https://adssettings.google.com" className="text-[#006728] underline" target="_blank" rel="noopener noreferrer">広告設定</a>）から管理できます</li>
          </ul>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">8. ポリシーの変更</h3>
          <p className="text-base">本ポリシーは予告なく変更する場合があります。変更後のポリシーは本ページに掲載した時点で効力を生じます。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">9. お問い合わせ</h3>
          <p className="text-base">個人情報の取り扱いに関するお問い合わせは、下記メールアドレスまでご連絡ください。</p>
          <img src="/images/email.svg" alt="メールアドレス" width={210} height={24} className="inline-block" />
        </section>
      </div>
    </PublicPageLayout>
  );
}
