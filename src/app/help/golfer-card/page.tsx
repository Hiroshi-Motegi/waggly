"use client";

import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export default function GolferCardHelpPage() {
  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2">
      <div className="relative flex flex-col space-y-2">
        <PageHeader title="ゴルファー名刺について" variant="dark" />

        {/* 概要 */}
        <div className="rounded-lg bg-white p-4">
          <p className="text-base leading-relaxed">
            ゴルファー名刺は、あなたのゴルフプロフィールをWebページとして公開できる機能です。
            URLを共有するだけで、クラブセッティングやスコア、SNSリンクをまとめて伝えられます。
          </p>
        </div>

        {/* 公開される情報 */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">公開される情報</h3>
          <ul className="list-disc pl-5 space-y-1 text-base">
            <li>ニックネーム・プロフィール画像</li>
            <li>ひとこと（自己紹介）</li>
            <li>ゴルフ歴・平均スコア・ベストスコア</li>
            <li>ホームコース</li>
            <li>クラブセッティング（バッグに登録したクラブ一覧）</li>
            <li>SNSリンク・カスタムリンク</li>
          </ul>
          <div className="mt-3 rounded-md bg-[#e8f5e9] px-3 py-2">
            <p className="text-sm text-[#2e7d32]">
              メールアドレスやログイン情報は公開されません
            </p>
          </div>
        </div>

        {/* 公開・非公開の設定 */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">公開・非公開の切り替え</h3>
          <p className="text-base leading-relaxed">
            設定画面の「シェア」から、名刺の公開・非公開を切り替えられます。非公開にすると、URLにアクセスしても名刺は表示されません。
          </p>
        </div>

        {/* FAQ */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">よくあるご質問</h3>
          <div className="space-y-0">
            {[
              {
                q: "名刺のURLは変更できる？",
                a: "設定画面のシェアページから、ユーザー名（URL末尾の文字列）を自由に変更できます。",
              },
              {
                q: "名刺に載せたくないクラブがある",
                a: "バッグに登録しているクラブが表示されます。表示したくないクラブは予備バッグに移動してください。",
              },
              {
                q: "名刺は誰でも見られる？",
                a: "公開設定にしている場合、URLを知っている人なら誰でも閲覧できます。検索エンジンにもインデックスされる可能性があります。",
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
      </div>
    </div>
  );
}
