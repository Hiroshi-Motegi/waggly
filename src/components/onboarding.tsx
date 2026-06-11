"use client";

import { useState } from "react";
import Image from "next/image";

interface OnboardingProps {
  onComplete: () => void;
  isReagreement?: boolean;
}

const TOTAL_SLIDES = 4;

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

function Slide1() {
  return (
    <div className="flex-1 flex flex-col items-center text-center px-6 pb-[70px] overflow-hidden">
      <div className="flex flex-col items-center justify-center pt-10 pb-4">
        <img
          src="/images/onboarding/waggly-logo.svg"
          alt="Waggly"
          width={185}
          height={60}
          className="mb-4"
        />
        <h2 className="text-xl font-bold text-[#139847] leading-snug mb-6">
          ゴルファーのための
          <br />
          ギア & 練習管理アプリ
        </h2>
        <p className="text-xl font-bold text-[#2c2c2c] leading-snug">
          ギアのこと、練習のこと、
          <br />
          まとめられます。
        </p>
      </div>
      <div className="relative w-full flex-1">
        <div className="absolute left-[2%] top-0 w-[58%] border-3 border-white rounded-sm overflow-hidden shadow-lg">
          <Image
            src="/onboarding/1-1.png"
            alt="マイバッグ画面"
            width={430}
            height={932}
            className="w-full h-auto"
          />
        </div>
        <div className="absolute right-[2%] top-[15%] w-[58%] border-3 border-white rounded-sm overflow-hidden shadow-lg">
          <Image
            src="/onboarding/1-2.png"
            alt="練習記録画面"
            width={430}
            height={932}
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}

function Slide2() {
  return (
    <div className="flex-1 flex flex-col items-center text-center overflow-hidden">
      {/* Header */}
      <div className="relative w-full py-4 px-6">
        <div className="absolute inset-0 bg-[#27b135]" />
        <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none" />
        <h2 className="relative text-xl font-bold text-white leading-snug">
          ギアをまとめて管理
          <br />
          仲間にかんたんシェア
        </h2>
      </div>
      {/* Content */}
      <div className="flex-1 flex flex-col items-center w-full px-4 pt-4 gap-2">
        {/* Club screenshot */}
        <div className="w-[60%] border-3 border-white rounded-sm overflow-hidden shadow-lg">
          <Image
            src="/onboarding/2-1.png"
            alt="クラブ詳細画面"
            width={430}
            height={532}
            className="w-full h-auto"
          />
        </div>
        {/* Callout 1 */}
        <div className="w-full border-3 border-[#006728] bg-white rounded p-3">
          <p className="text-base font-bold text-[#2c2c2c] text-center leading-snug">
            クラブ詳細や飛距離・使用感、
            <br />
            メンテナンス記録などをクラブ単位で登録
          </p>
        </div>
        {/* Share screenshot */}
        <div className="w-[60%] border-3 border-white rounded-sm overflow-hidden shadow-lg">
          <Image
            src="/onboarding/2-2.png"
            alt="シェア画面"
            width={430}
            height={532}
            className="w-full h-auto"
          />
        </div>
        {/* Callout 2 */}
        <div className="w-full border-3 border-[#006728] bg-white rounded p-3">
          <p className="text-base font-bold text-[#2c2c2c] text-center leading-snug">
            自分のクラブセットをQRコードで簡単シェア
            <br />
            名刺代わりに友だちに紹介
          </p>
        </div>
      </div>
    </div>
  );
}

function Slide3() {
  return (
    <div className="flex-1 flex flex-col items-center text-center overflow-hidden">
      {/* Header */}
      <div className="relative w-full py-4 px-6">
        <div className="absolute inset-0 bg-[#27b135]" />
        <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none" />
        <h2 className="relative text-xl font-bold text-white leading-snug">
          練習球数や内容を
          <br />
          かんたんに記録できます
        </h2>
      </div>
      {/* Content */}
      <div className="flex-1 flex flex-col items-center w-full px-4 pt-4">
        <div className="relative w-full flex-1 overflow-hidden">
          <div className="absolute left-0 top-0 w-[56%] border-3 border-white rounded-sm overflow-hidden shadow-lg">
            <Image
              src="/onboarding/3-1.png"
              alt="練習記録一覧"
              width={430}
              height={932}
              className="w-full h-auto"
            />
          </div>
          <div className="absolute right-0 top-[10%] w-[56%] border-3 border-white rounded-sm overflow-hidden shadow-lg">
            <Image
              src="/onboarding/3-2.png"
              alt="練習記録入力"
              width={430}
              height={932}
              className="w-full h-auto"
            />
          </div>
        </div>
        {/* Callout */}
        <div className="w-full border-3 border-[#006728] bg-white rounded p-3 mt-2">
          <p className="text-base font-bold text-[#2c2c2c] text-center leading-snug">
            練習結果を元に
            <br />
            AIに練習メニューの相談ができます
          </p>
        </div>
        {/* Notes */}
        <div className="w-full text-left px-1 py-3">
          <p className="text-xs font-bold text-[#2c2c2c] leading-relaxed">
            ※ AI機能はベータ公開中となります。
            <br />
            &nbsp;&nbsp;&nbsp;&nbsp;正式リリース時にプラン体系が変更される場合があります。
          </p>
          <p className="text-xs font-bold text-[#2c2c2c] leading-relaxed mt-2">
            ※ アカウントログインで利用可能となります。
          </p>
        </div>
      </div>
    </div>
  );
}

function Slide4({ agreed, setAgreed, showTerms }: { agreed: boolean; setAgreed: (v: boolean) => void; showTerms: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="flex-1" />
      <h2 className="text-[32px] font-bold text-[#139847] mb-6">
        さあ、はじめよう！
      </h2>
      <Image
        src="/images/onboarding/waggly-ball.png"
        alt="Waggly"
        width={128}
        height={128}
        className="mb-6"
      />
      <div className="flex-1" />
      <div className="w-full pb-2">
        <p className="text-base font-bold text-[#2c2c2c] leading-relaxed mb-4">
          ワグリーを利用するためには
          <br />
          利用規約の同意が必要です
        </p>
        <label className="flex items-center justify-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-5 w-5 rounded accent-[#006728]"
          />
          <span className="text-[#666]">
            <button onClick={showTerms} className="underline text-[#006728]">利用規約</button>
            に同意します
          </span>
        </label>
      </div>
    </div>
  );
}

export function Onboarding({ onComplete, isReagreement }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(isReagreement ? TOTAL_SLIDES - 1 : 0);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const isLastSlide = currentSlide === TOTAL_SLIDES - 1;

  function handleNext() {
    if (isLastSlide) return;
    setCurrentSlide(currentSlide + 1);
  }

  function handleStart() {
    if (!agreed) return;
    onComplete();
  }

  // Terms view
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

  // Reagreement: only show slide 4
  if (isReagreement) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#f7fff3]">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <span className="text-6xl mb-6">📋</span>
          <h2 className="text-2xl font-bold mb-3">利用規約が更新されました</h2>
          <p className="text-[#666] text-base leading-relaxed">引き続きご利用いただくには、更新された利用規約への同意が必要です。</p>
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
            onClick={handleStart}
            className="w-full py-3 rounded-full border border-[#006728] text-[#006728] font-bold text-sm disabled:opacity-40"
          >
            はじめる
          </button>
        </div>
      </div>
    );
  }

  // Slides view
  return (
    <div className="flex flex-col min-h-dvh bg-[#f7fff3] overflow-hidden">
      {currentSlide === 0 && <Slide1 />}
      {currentSlide === 1 && <Slide2 />}
      {currentSlide === 2 && <Slide3 />}
      {currentSlide === 3 && (
        <Slide4
          agreed={agreed}
          setAgreed={setAgreed}
          showTerms={() => setShowTerms(true)}
        />
      )}

      {/* Bottom bar — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#026f09] py-3 flex flex-col items-center gap-3">
        {/* Dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentSlide ? "w-5 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
        <button
          onClick={isLastSlide ? handleStart : handleNext}
          disabled={isLastSlide && !agreed}
          className="px-8 py-2.5 rounded-full border border-[#006728] bg-white text-[#006728] font-bold text-sm disabled:opacity-40"
        >
          {isLastSlide ? "はじめる" : "次へ"}
        </button>
      </div>
    </div>
  );
}
