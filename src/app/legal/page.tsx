"use client";

import { PageHeader } from "@/components/layout/page-header";

export default function LegalPage() {
  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="特定商取引法に基づく表記" variant="dark" />

        <div className="rounded-lg bg-white p-4 space-y-4 leading-relaxed">
          <table className="w-full text-sm">
            <tbody>
              {[
                ["販売業者", "茂木 宏"],
                ["運営責任者", "茂木 宏"],
                ["所在地", "お問い合わせいただいた方に個別にお知らせいたします"],
                ["電話番号", "お問い合わせいただいた方に個別にお知らせいたします"],
                ["メールアドレス", "support@waggly.jp"],
                ["サービス名", "Waggly"],
                ["販売価格", "Waggly Pro: 月額480円（税込）"],
                ["支払方法", "クレジットカード（Pay.jp経由）"],
                ["支払時期", "契約時に初回決済、以降毎月同日に自動決済"],
                ["サービス提供時期", "決済完了後、即時ご利用いただけます"],
                ["返品・キャンセル", "デジタルサービスのため返品不可。サブスクリプションはいつでも解約可能です。解約した場合、当月の課金期間終了までサービスをご利用いただけます。日割り返金は行いません。"],
                ["動作環境", "最新版のChrome, Safari, Edge等のモダンブラウザ。iOS/Androidアプリ。"],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-[#ececec]">
                  <th className="py-3 pr-3 text-left align-top font-bold text-[#333] whitespace-nowrap w-[100px]">
                    {label}
                  </th>
                  <td className="py-3 text-[#666]">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
