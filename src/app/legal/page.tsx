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
                { label: "販売業者", value: "cocoroe" },
                { label: "運営責任者", value: "Hiroshi Motegi" },
                { label: "所在地", value: "お問い合わせいただいた方に個別にお知らせいたします" },
                { label: "電話番号", value: "お問い合わせいただいた方に個別にお知らせいたします" },
                { label: "メールアドレス", value: <img src="/images/email.svg" alt="メールアドレス" width={210} height={24} className="inline-block" /> },
                { label: "サービス名", value: "Waggly" },
                { label: "販売価格", value: "Waggly Pro: 月額480円（税込）、広告非表示オプション: 100円（税込・買い切り）" },
                { label: "支払方法", value: "クレジットカード（Pay.jp経由）" },
                { label: "支払時期", value: "契約時に初回決済、以降毎月同日に自動決済" },
                { label: "サービス提供時期", value: "決済完了後、即時ご利用いただけます" },
                { label: "返品・キャンセル", value: "デジタルサービスのため返品不可。サブスクリプションはいつでも解約可能です。解約した場合、当月の課金期間終了までサービスをご利用いただけます。日割り返金は行いません。" },
                { label: "動作環境", value: "最新版のChrome, Safari, Edge等のモダンブラウザ。iOS/Androidアプリ。" },
              ].map((item) => (
                <tr key={item.label} className="border-b border-[#ececec]">
                  <th className="py-3 pr-3 text-left align-top font-bold text-[#333] whitespace-nowrap w-[100px]">
                    {item.label}
                  </th>
                  <td className="py-3 text-[#666]">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
