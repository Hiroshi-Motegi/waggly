"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";

export default function DeleteAccountHelpPage() {
  const { user } = useAuth();
  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2">
      <div className="relative flex flex-col space-y-2">
        <PageHeader title="データの削除・退会について" variant="dark" />

        {/* 概要 */}
        <div className="rounded-lg bg-white p-4">
          <p className="text-base leading-relaxed">
            Wagglyでは、アプリ内の設定画面からいつでもアカウントの削除（退会）が可能です。
          </p>
        </div>

        {/* 削除手順 */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">退会の手順</h3>
          <div className="space-y-3">
            {[
              "設定画面を開く",
              "「アカウント削除」をタップ",
              "確認画面で「削除する」をタップ",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-[#006728] text-white text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-base pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 削除されるデータ */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">削除されるデータ</h3>
          <ul className="list-disc pl-5 space-y-1 text-base">
            <li>アカウント情報（ニックネーム、プロフィール画像等）</li>
            <li>クラブ・アイテムの登録データ</li>
            <li>練習記録</li>
            <li>AIコーチとの会話履歴</li>
            <li>サブスクリプション情報</li>
            <li>公開プロフィール（ゴルファー名刺）</li>
          </ul>
          <div className="mt-3 rounded-md bg-[#fff3e0] px-3 py-2">
            <p className="text-sm font-bold text-[#e65100]">
              ⚠ 削除されたデータは復元できません
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">よくあるご質問</h3>
          <div className="space-y-0">
            {[
              {
                q: "退会後にデータは残る？",
                a: "いいえ。アカウント削除と同時にすべてのデータがサーバーから削除されます。バックアップも保持しません。",
              },
              {
                q: "有料プラン契約中に退会したら？",
                a: "サブスクリプションは自動的に解約されます。日割り返金はありませんので、課金期間の終了を待ってから退会されることをおすすめします。",
              },
              {
                q: "退会後に再登録できる？",
                a: "同じアカウント（LINE・Google）で再登録可能ですが、以前のデータは復元されず、新規アカウントとして作成されます。",
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

        {/* 退会ボタン */}
        {user && (
          <div className="flex justify-center pt-6 pb-4">
            <Link href="/settings/delete-account" className="rounded-full bg-white px-6 py-2.5 text-base font-bold text-red-500">
              アカウントを削除する
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
