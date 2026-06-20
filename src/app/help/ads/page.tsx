"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PublicPageLayout } from "@/components/layout/public-page-layout";

export default function AdsHelpPage() {
  return (
    <PublicPageLayout title="広告表示について" backHref="/help">
        {/* 概要 */}
        <div className="rounded-lg bg-white p-4">
          <p className="text-base leading-relaxed">
            Wagglyでは、無料でサービスを提供するために広告を表示しています。
            <br />
            広告が気になる方は、買い切りで非表示にできます。
          </p>
        </div>

        {/* 広告の種類 */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">表示される広告</h3>
          <div className="space-y-2.5">
            <div className="border-b border-[#ececec] pb-2.5">
              <p className="text-sm font-bold">バナー広告</p>
              <p className="text-sm text-[#8b8b8b]">ホーム画面・チャット画面の下部に表示</p>
            </div>
            <div>
              <p className="text-sm font-bold">全画面広告</p>
              <p className="text-sm text-[#8b8b8b]">10ページ遷移ごとに1回表示されます</p>
            </div>
          </div>
        </div>

        {/* 広告非表示 */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">広告を非表示にするには</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#ececec] pb-2.5">
              <span className="text-sm font-bold">広告非表示</span>
              <span className="text-sm font-bold text-[#006728]">¥100（買い切り）</span>
            </div>
            <p className="text-sm text-[#8b8b8b]">
              一度購入すれば、同じアカウントならどの端末でもずっと広告なしで利用できます。
            </p>
            <p className="text-sm text-[#8b8b8b]">
              設定画面の「広告を非表示にする」から購入できます。プロモコードをお持ちの場合は購入画面で入力してください。
            </p>
            <Link href="/settings/remove-ads" className="text-sm text-[#006728] underline inline-block">
              広告を非表示にする
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">よくあるご質問</h3>
          <div className="space-y-0">
            {[
              {
                q: "Proプランに加入すれば広告は消える？",
                a: "いいえ。広告非表示はProプランとは別の買い切りオプションです。Proプランでは広告は非表示になりません。",
              },
              {
                q: "広告非表示を購入後に返金できる？",
                a: "デジタルコンテンツのため、購入後の返金には対応しておりません。",
              },
              {
                q: "機種変更したらどうなる？",
                a: "同じアカウントでログインすれば、新しい端末でも広告非表示が引き継がれます。",
              },
            ].map((item, i, arr) => (
              <details
                key={i}
                open
                className={`group py-3 ${i < arr.length - 1 ? "border-b border-[#ececec]" : ""}`}
              >
                <summary className="text-base font-bold cursor-pointer list-none flex items-center gap-1">
                  <span className="text-[#006728]">Q.</span>
                  <span className="flex-1">{item.q}</span>
                  <ChevronDown className="h-4 w-4 text-[#8b8b8b] shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="text-base text-[#666] leading-relaxed mt-1.5 pl-0.5">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-white/70 py-4">
          ご不明な点があればお問い合わせください。
        </p>
    </PublicPageLayout>
  );
}
