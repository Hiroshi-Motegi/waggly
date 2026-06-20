"use client";

import { PublicPageLayout } from "@/components/layout/public-page-layout";

export default function HelpCatalogPage() {
  return (
    <PublicPageLayout title="クラブカタログ・比較について" backHref="/help">
        <div className="rounded-lg bg-white p-4 space-y-5 leading-relaxed">
          <section className="space-y-1">
            <h3 className="text-base font-bold text-[#006728]">クラブカタログとは</h3>
            <p className="text-base">各メーカーのゴルフクラブのスペック情報を閲覧できる機能です。ドライバー・フェアウェイウッド・ユーティリティ・アイアン・ウェッジ・パターの各カテゴリからクラブを探せます。</p>
          </section>

          <section className="space-y-1">
            <h3 className="text-base font-bold text-[#006728]">クラブ比較とは</h3>
            <p className="text-base">2つのクラブモデルのスペックを番手別に並べて比較できる機能です。ロフト角・ライ角・クラブ長さなどの違いを一目で確認できます。</p>
          </section>

          <section className="space-y-1">
            <h3 className="text-base font-bold text-[#006728]">お気に入り機能</h3>
            <p className="text-base">ログインすると、気になるクラブをお気に入りに登録できます。カタログのモデル詳細ページ右上のハートマークをタップしてください。お気に入りしたクラブはカタログトップで一覧表示されます。</p>
          </section>

          <section className="space-y-1">
            <h3 className="text-base font-bold text-[#006728]">スペック情報について</h3>
            <p className="text-base">掲載しているスペック情報は、公開情報を元に収集した参考値です。以下の点にご注意ください。</p>
            <ul className="list-disc pl-5 space-y-0.5 text-base">
              <li>最新の情報と異なる場合があります</li>
              <li>一部のモデルではスペック情報が不完全な場合があります</li>
              <li>正確な情報は各メーカーの公式サイトをご確認ください</li>
            </ul>
          </section>

          <section className="space-y-1">
            <h3 className="text-base font-bold text-[#006728]">商標について</h3>
            <p className="text-base">掲載されているメーカー名・ブランド名・商品名等は、各権利者の商標または登録商標です。本サービスはこれらの商標権者との提携・推奨関係を示すものではありません。</p>
          </section>
        </div>
    </PublicPageLayout>
  );
}
