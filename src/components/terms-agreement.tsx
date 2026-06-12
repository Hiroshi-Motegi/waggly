// src/components/terms-agreement.tsx
"use client";

import { useState } from "react";

interface TermsAgreementProps {
  onAgree: () => void;
  isReagreement?: boolean;
}

const termsContent = [
  { title: "第1条（サービス内容）", body: "Waggly（以下「本サービス」）は、ゴルフクラブの管理、練習記録、AIによるアドバイス機能を提供するWebアプリケーションです。" },
  { title: "第2条（AI機能について）", body: "本サービスのAIコーチ機能はベータ版として提供しています。AIの回答は一般的な情報に基づくものであり、正確性を保証するものではありません。ゴルフの指導やクラブ選びの最終判断はご自身で行ってください。" },
  { title: "第3条（個人情報の取り扱い）", body: "本サービスでは、LINEアカウント情報（表示名・プロフィール画像）、登録されたクラブ情報、練習記録、AIとの会話履歴を保存します。これらの情報はサービス提供の目的のみに使用し、個人を特定できる形での第三者への提供は行いません。" },
  { title: "第4条（匿名データの活用）", body: "本サービスでは、サービス品質の向上を目的として、ユーザーの登録データ（クラブスペック、練習記録、AI提案への評価等）を匿名化・統計化した上で、AI機能の改善に活用する場合があります。統計データには個人を特定できる情報は含まれません。例：クラブの平均飛距離、練習メニューの傾向分析等。" },
  { title: "第5条（禁止事項）", body: "本サービスへの不正アクセスや過度な負荷をかける行為、AI機能を本来の目的以外で利用する行為、他のユーザーに迷惑をかける行為を禁止します。" },
  { title: "第6条（免責事項）", body: "本サービスは現状有姿で提供され、特定の目的への適合性を保証しません。本サービスの利用により生じた損害について、運営者は一切の責任を負いません。" },
  { title: "第7条（サービスの変更・停止）", body: "運営者は、事前の通知なくサービス内容の変更、または提供の停止を行うことがあります。" },
  { title: "第8条（規約の変更）", body: "本規約は予告なく変更することがあります。変更後の規約は本ページに掲載した時点で効力を生じます。" },
];

export function TermsAgreement({ onAgree, isReagreement }: TermsAgreementProps) {
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  if (showTerms) {
    return (
      <div className="flex flex-col min-h-dvh bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-base font-bold">利用規約</span>
          <button
            onClick={() => setShowTerms(false)}
            className="text-base text-[#006728] font-bold"
          >
            戻る
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-base">
          <p className="text-sm text-[#8b8b8b]">最終更新日: 2026年6月8日</p>
          {termsContent.map((section, i) => (
            <div key={i} className="space-y-1">
              <h3 className="font-bold">{section.title}</h3>
              <p className="text-[#666]">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#f7fff3]">
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        {isReagreement ? (
          <>
            <h2 className="text-2xl font-bold mb-3">利用規約が更新されました</h2>
            <p className="text-[#666] text-base leading-relaxed">引き続きご利用いただくには、更新された利用規約への同意が必要です。</p>
          </>
        ) : (
          <>
            <h2 className="text-[32px] font-bold text-[#139847] mb-6">
              さあ、はじめよう！
            </h2>
            <img
              src="/images/onboarding/waggly-ball.svg"
              alt="Waggly"
              width={128}
              height={128}
              className="mt-4 mb-6"
              style={{ animation: "smallBounce 1.2s ease-in-out infinite" }}
            />
            <p className="text-base font-bold text-[#2c2c2c] leading-relaxed">
              ワグリーを利用するためには
              <br />
              利用規約の同意が必要です
            </p>
          </>
        )}
      </div>
      <div className="w-full px-6 pb-6 space-y-4">
        <label className="flex items-center justify-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-5 w-5 rounded accent-[#006728]"
          />
          <span className="text-[#666]">
            <button onClick={() => setShowTerms(true)} className="underline text-[#006728]">利用規約</button>
            に同意します
          </span>
        </label>
        <button
          disabled={!agreed}
          onClick={onAgree}
          className="w-full py-3 rounded-full border border-[#006728] text-[#006728] font-bold text-sm disabled:opacity-40"
        >
          はじめる
        </button>
      </div>
    </div>
  );
}
