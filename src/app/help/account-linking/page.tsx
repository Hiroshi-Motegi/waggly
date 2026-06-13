"use client";

import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export default function AccountLinkingHelpPage() {
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
        <PageHeader title="アカウント連携について" variant="dark" />

        {/* 概要 */}
        <div className="rounded-lg bg-white p-4">
          <p className="text-base leading-relaxed">
            Wagglyはクラウド同期により、Webブラウザとスマホアプリで同じデータを使えます。
            <br />
            アプリで同期するには、各プラットフォームに対応したアカウントの連携が必要です。
          </p>
        </div>

        {/* 対応表 */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">プラットフォーム別の対応</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ececec]">
                <th className="text-left font-normal text-[#8b8b8b] pb-2">
                  プラットフォーム
                </th>
                <th className="text-left font-normal text-[#8b8b8b] pb-2">
                  同期に必要なアカウント
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#ececec]">
                <td className="py-2.5 font-bold">Webブラウザ</td>
                <td className="py-2.5">
                  <span className="rounded-full bg-[#e8f5e9] px-2 py-0.5 text-xs font-bold text-[#2e7d32]">
                    どれでもOK
                  </span>
                </td>
              </tr>
              <tr className="border-b border-[#ececec]">
                <td className="py-2.5 font-bold">Androidアプリ</td>
                <td className="py-2.5">
                  <span className="rounded-full bg-[#fff3e0] px-2 py-0.5 text-xs font-bold text-[#e65100]">
                    Google必須
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold">iOSアプリ</td>
                <td className="py-2.5">
                  <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#8b8b8b]">
                    準備中
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* こんなときは */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">こんなときは</h3>
          <div className="space-y-3">
            <div className="border-b border-[#ececec] pb-3">
              <div className="flex items-center gap-1.5 flex-wrap text-sm">
                <span className="font-bold">LINEで利用中</span>
                <span className="text-[#006728] font-bold">→</span>
                <span className="font-bold">Androidアプリで同期したい</span>
              </div>
              <span className="mt-1.5 inline-block rounded-md bg-[#e8f5e9] px-2 py-1 text-xs font-bold text-[#006728]">
                Web版の設定からGoogle連携を追加
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap text-sm">
                <span className="font-bold">Googleで利用中</span>
                <span className="text-[#006728] font-bold">→</span>
                <span className="font-bold">Web版でLINEログインしたい</span>
              </div>
              <span className="mt-1.5 inline-block rounded-md bg-[#e8f5e9] px-2 py-1 text-xs font-bold text-[#006728]">
                Web版またはアプリの設定からLINE連携を追加
              </span>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">よくあるご質問</h3>
          <div className="space-y-0">
            {[
              {
                q: "連携するとデータはどうなる？",
                a: "今のデータはそのまま残ります。アカウントに別のログイン方法を追加するだけです。",
              },
              {
                q: "連携先にすでにアカウントがある場合は？",
                a: "どちらのデータを残すか選べる画面が表示されます。選ばなかった方のデータは削除されます。",
              },
              {
                q: "連携を解除したらどうなる？",
                a: "そのログイン方法が使えなくなるだけで、データは残ります。ただし最低1つのログイン方法は必要です。",
              },
            ].map((item, i, arr) => (
              <details
                key={i}
                open
                className={`group py-3 ${i < arr.length - 1 ? "border-b border-[#ececec]" : ""}`}
              >
                <summary className="text-sm font-bold cursor-pointer list-none flex items-center gap-1">
                  <span className="text-[#006728]">Q.</span>
                  <span className="flex-1">{item.q}</span>
                  <ChevronDown className="h-4 w-4 text-[#8b8b8b] shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="text-sm text-[#666] leading-relaxed mt-1.5 pl-0.5">
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
