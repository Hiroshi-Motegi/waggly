"use client";

import { useState } from "react";
import Image from "next/image";

interface OnboardingProps {
  onComplete: () => void;
}

const TOTAL_SLIDES = 4;

function Slide1() {
  return (
    <div className="flex-1 flex flex-col items-center text-center overflow-y-auto px-6 pt-10 pb-4">
      <img
        src="/icons/waggly-logo-white.svg"
        alt="Waggly"
        width={185}
        height={60}
        className="mb-4 shrink-0"
      />
      <h2 className="text-xl font-bold text-white leading-snug mb-6 shrink-0">
        ゴルファーのための
        <br />
        ギア & 練習管理アプリ
      </h2>
      <p className="text-xl font-bold text-white leading-snug mb-6 shrink-0">
        ギアのこと、練習のこと、
        <br />
        まとめられます。
      </p>
      <div className="relative w-full shrink-0 mt-6" style={{ paddingBottom: "120%" }}>
        <img
          src="/onboarding/1-1.png"
          alt="マイバッグ画面"
          className="absolute left-0 bottom-0 w-[58%] border border-white rounded-sm z-[1]"
        />
        <img
          src="/onboarding/1-2.png"
          alt="練習記録画面"
          className="absolute right-0 bottom-0 w-[50%] border border-white rounded-sm"
        />
      </div>
    </div>
  );
}

function Slide2() {
  return (
    <div className="flex-1 flex flex-col items-center text-center overflow-y-auto px-6 pt-10 pb-4">
      <h2 className="text-xl font-bold text-white leading-snug mb-6 shrink-0">
        ギアをまとめて管理
        <br />
        仲間にかんたんシェア
      </h2>
      {/* Club screenshot */}
      <div className="w-[57%] border border-white rounded-sm overflow-hidden shrink-0 mt-6">
        <Image
          src="/onboarding/2-1.png"
          alt="クラブ詳細画面"
          width={454}
          height={556}
          className="w-full h-auto"
        />
      </div>
      {/* Callout 1 */}
      <div className="w-full bg-white/90 rounded p-3 mb-4 shrink-0">
        <p className="text-base font-bold text-[#2c2c2c] text-center leading-snug">
          クラブ詳細や飛距離・使用感、
          <br />
          メンテナンス記録などをクラブ単位で登録
        </p>
      </div>
      {/* Share screenshot */}
      <div className="w-[57%] border border-white rounded-sm overflow-hidden shrink-0">
        <Image
          src="/onboarding/2-2.png"
          alt="シェア画面"
          width={456}
          height={556}
          className="w-full h-auto"
        />
      </div>
      {/* Callout 2 */}
      <div className="w-full bg-white/90 rounded p-3 shrink-0">
        <p className="text-base font-bold text-[#2c2c2c] text-center leading-snug">
          自分のクラブセットをQRコードで簡単シェア
          <br />
          名刺代わりに友だちに紹介
        </p>
      </div>
    </div>
  );
}

function Slide3() {
  return (
    <div className="flex-1 flex flex-col items-center text-center overflow-y-auto px-6 pt-10 pb-4">
      <h2 className="text-xl font-bold text-white leading-snug mb-6 shrink-0">
        練習球数や内容を
        <br />
        かんたんに記録できます
      </h2>
      <div className="relative w-full shrink-0 mt-6" style={{ paddingBottom: "120%" }}>
        <img
          src="/onboarding/3-1.png"
          alt="練習記録一覧"
          className="absolute left-0 bottom-0 w-[58%] border border-white rounded-sm z-[1]"
        />
        <img
          src="/onboarding/3-2.png"
          alt="練習記録入力"
          className="absolute right-0 bottom-0 w-[50%] border border-white rounded-sm"
        />
      </div>
      {/* Callout */}
      <div className="w-full bg-white/90 rounded p-3 shrink-0">
        <p className="text-base font-bold text-[#2c2c2c] text-center leading-snug">
          練習結果を元に
          <br />
          AIに練習メニューの相談ができます
        </p>
      </div>
      {/* Notes */}
      <ul className="w-full text-left px-1 py-3 text-xs font-bold text-white/80 leading-relaxed list-disc pl-5 space-y-2 shrink-0">
        <li>AI機能はベータ公開中となります。正式リリース時にプラン体系が変更される場合があります。</li>
        <li>アカウントログインで利用可能となります。</li>
      </ul>
    </div>
  );
}

function Slide4() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <h2 className="text-[32px] font-bold text-white mb-6">
        さあ、はじめよう！
      </h2>
      <img
        src="/images/witb-ball-logo.png"
        alt="Waggly"
        width={65}
        height={68}
        className="mt-4 mb-6"
        style={{ animation: "smallBounce 1.2s ease-in-out infinite" }}
      />
    </div>
  );
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLastSlide = currentSlide === TOTAL_SLIDES - 1;

  function handleNext() {
    if (isLastSlide) {
      onComplete();
      return;
    }
    setCurrentSlide(currentSlide + 1);
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      {currentSlide === 0 && <Slide1 />}
      {currentSlide === 1 && <Slide2 />}
      {currentSlide === 2 && <Slide3 />}
      {currentSlide === 3 && <Slide4 />}

      <div className="shrink-0 py-3 flex flex-col items-center gap-3 relative z-10"
        style={{ background: "#7cb668 url(/images/home-bg.jpg) center / cover fixed", backgroundBlendMode: "soft-light" }}
      >
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        <div className="relative flex gap-1.5">
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
          onClick={handleNext}
          className="relative px-8 py-2.5 rounded-full bg-white text-[#006728] font-bold text-sm"
        >
          {isLastSlide ? "はじめる" : "次へ"}
        </button>
      </div>
    </div>
  );
}
