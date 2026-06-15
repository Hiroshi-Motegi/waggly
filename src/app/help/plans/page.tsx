"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export default function PlansHelpPage() {
  return (
    <div
      className="relative flex flex-col px-2 py-2 space-y-2"
      style={{
        minHeight: "100dvh",
        paddingBottom: "var(--bottom-nav-height)",
        marginBottom: "calc(-1 * var(--bottom-nav-height))",
      }}
    >
      <div className="relative flex flex-col space-y-2">
        <PageHeader title="プランについて" variant="dark" />

        {/* 概要 */}
        <div className="rounded-lg bg-white p-4">
          <p className="text-base leading-relaxed">
            Wagglyは無料で基本機能がすべて使えます。
            <br />
            Waggly Proに加入すると、さらに便利な機能が使えるようになります。
          </p>
        </div>

        {/* プラン比較 */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">プラン比較</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ececec]">
                <th className="text-left font-normal text-[#8b8b8b] pb-2">機能</th>
                <th className="text-center font-normal text-[#8b8b8b] pb-2">無料</th>
                <th className="text-center font-normal text-[#8b8b8b] pb-2">Pro</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "ギア管理", free: true, pro: true },
                { feature: "練習メモ", free: true, pro: true },
                { feature: "プロフィール公開", free: true, pro: true },
                { feature: "AIチャット相談", free: "制限あり", pro: "無制限" },
              ].map((row, i, arr) => (
                <tr key={i} className={i < arr.length - 1 ? "border-b border-[#ececec]" : ""}>
                  <td className="py-2.5 font-bold">{row.feature}</td>
                  <td className="py-2.5 text-center">
                    {row.free === true ? "○" : typeof row.free === "string" ? row.free : "−"}
                  </td>
                  <td className="py-2.5 text-center text-[#006728] font-bold">
                    {row.pro === true ? "○" : typeof row.pro === "string" ? row.pro : "−"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 料金 */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">料金</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#ececec] pb-2.5">
              <span className="text-sm font-bold">Waggly Pro</span>
              <span className="text-sm font-bold text-[#006728]">¥480/月</span>
            </div>
            <p className="text-sm text-[#8b8b8b]">
              月額制で、いつでも解約できます。解約後も契約期間の終わりまで利用できます。
            </p>
          </div>
        </div>

        {/* 広告について */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">広告について</h3>
          <p className="text-base text-[#666] leading-relaxed">
            一部の画面に広告が表示されます。広告非表示は¥100の買い切りオプションで、Waggly Proとは別になります。
            <br />
            <span className="font-bold text-[#333]">Proに加入しても広告は表示されます。</span>広告を非表示にしたい場合は別途、広告非表示オプションをご購入ください。
          </p>
          <Link href="/help/ads" className="text-sm text-[#006728] underline mt-2 inline-block">
            広告表示について詳しく見る
          </Link>
        </div>

        {/* FAQ */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">よくあるご質問</h3>
          <div className="space-y-0">
            {[
              {
                q: "無料のままでも使い続けられる？",
                a: "はい。ギア管理や練習メモなどの基本機能は無料で使い続けられます。",
              },
              {
                q: "Proを解約したらデータは消える？",
                a: "いいえ。解約してもデータはすべて残ります。Pro限定機能が制限されるだけです。",
              },
              {
                q: "支払い方法は？",
                a: "クレジットカード（Visa / Mastercard / JCB / AMEX / Diners）に対応しています。",
              },
              {
                q: "クーポンは使える？",
                a: "はい。購入画面でプロモコードを入力すると割引が適用されます。",
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
      </div>
    </div>
  );
}
