"use client";

import { PageHeader } from "@/components/layout/page-header";

export default function ContactHelpPage() {
  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2">
      <div className="relative flex flex-col space-y-2">
        <PageHeader title="お問い合わせ" variant="dark" />

        {/* 概要 */}
        <div className="rounded-lg bg-white p-4">
          <p className="text-base leading-relaxed">
            Wagglyに関するご質問・ご要望・不具合のご報告は、以下のメールアドレスまでお気軽にご連絡ください。
          </p>
        </div>

        {/* 連絡先 */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">メールでのお問い合わせ</h3>
          <img src="/images/email.svg" alt="メールアドレス" width={210} height={24} className="inline-block" />
          <p className="text-sm text-[#8b8b8b] mt-2">
            通常2〜3営業日以内にご返信いたします。
          </p>
        </div>

        {/* お問い合わせ時のお願い */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">お問い合わせ時のお願い</h3>
          <p className="text-base leading-relaxed mb-2">
            よりスムーズに対応するため、以下の情報をお書き添えください。
          </p>
          <ul className="list-disc pl-5 space-y-1 text-base">
            <li>ご利用の環境（Webブラウザ / Androidアプリ）</li>
            <li>発生している問題の具体的な内容</li>
            <li>スクリーンショット（可能であれば）</li>
          </ul>
        </div>

        {/* 運営情報 */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">運営</h3>
          <p className="text-base">cocoroe</p>
          <p className="text-sm text-[#8b8b8b] mt-1">運営責任者: 茂木 洋</p>
        </div>
      </div>
    </div>
  );
}
