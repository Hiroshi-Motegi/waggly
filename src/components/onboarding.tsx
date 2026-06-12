"use client";

import { useState } from "react";
import Image from "next/image";

interface OnboardingProps {
  onComplete: () => void;
}

const TOTAL_SLIDES = 3;

function Slide1() {
  return (
    <div className="flex-1 flex flex-col items-center text-center px-6">
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
      {/* Screenshots — overlapping, extend past bottom edge */}
      <div className="relative w-full h-[120%] shrink-0">
        <img
          src="/onboarding/1-1.png"
          alt="マイバッグ画面"
          className="absolute left-[-10px] top-[calc(12%+5px)] w-[56%] border-3 border-white scale-[1.2] origin-bottom-left"
        />
        <img
          src="/onboarding/1-2.png"
          alt="練習記録画面"
          className="absolute left-[calc(40%+30px)] top-[calc(12%+5px)] w-[56%] border-3 border-white scale-110 origin-bottom-right"
        />
      </div>
    </div>
  );
}

function Slide2() {
  return (
    <div className="flex-1 flex flex-col items-center text-center overflow-y-auto pb-[70px]">
      {/* Header */}
      <div className="relative w-full py-4 px-6 shrink-0">
        <div className="absolute inset-0 bg-[#139847]" />
        <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
        <h2 className="relative text-xl font-bold text-white leading-snug">
          ギアをまとめて管理
          <br />
          仲間にかんたんシェア
        </h2>
      </div>
      {/* Content */}
      <div className="flex flex-col items-center w-full px-4 pt-4 pb-8">
        {/* Club screenshot */}
        <div className="w-[57%] border-3 border-white rounded-sm overflow-hidden">
          <Image
            src="/onboarding/2-1.png"
            alt="クラブ詳細画面"
            width={430}
            height={532}
            className="w-full h-auto"
          />
        </div>
        {/* Callout 1 */}
        <div className="w-full border-3 border-[#006728] bg-white rounded p-3 mb-4">
          <p className="text-base font-bold text-[#2c2c2c] text-center leading-snug">
            クラブ詳細や飛距離・使用感、
            <br />
            メンテナンス記録などをクラブ単位で登録
          </p>
        </div>
        {/* Share screenshot */}
        <div className="w-[57%] border-3 border-white rounded-sm overflow-hidden">
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
    <div className="flex-1 flex flex-col items-center text-center overflow-y-auto pb-[70px]">
      {/* Header */}
      <div className="relative w-full py-4 px-6 shrink-0">
        <div className="absolute inset-0 bg-[#139847]" />
        <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
        <h2 className="relative text-xl font-bold text-white leading-snug">
          練習球数や内容を
          <br />
          かんたんに記録できます
        </h2>
      </div>
      {/* Content */}
      <div className="flex flex-col items-center w-full px-4 pt-4 pb-8">
        <div className="relative w-full" style={{ paddingBottom: "130%" }}>
          <img
            src="/onboarding/3-1.png"
            alt="練習記録一覧"
            className="absolute left-0 top-0 w-[56%] border-3 border-white"
          />
          <img
            src="/onboarding/3-2.png"
            alt="練習記録入力"
            className="absolute left-[calc(40%+17px)] top-[10%] w-[56%] border-3 border-white"
          />
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
        <ul className="w-full text-left px-1 py-3 text-xs font-bold text-[#2c2c2c] leading-relaxed list-disc pl-5 space-y-2">
          <li>AI機能はベータ公開中となります。正式リリース時にプラン体系が変更される場合があります。</li>
          <li>アカウントログインで利用可能となります。</li>
        </ul>
      </div>
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
    <div className="flex flex-col h-dvh bg-[#f7fff3] overflow-hidden">
      {currentSlide === 0 && <Slide1 />}
      {currentSlide === 1 && <Slide2 />}
      {currentSlide === 2 && <Slide3 />}

      <div className="fixed bottom-0 left-0 right-0 z-50 py-3 flex flex-col items-center gap-3 overflow-hidden">
        <div className="absolute inset-0 bg-[#139847]" />
        <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
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
          className="relative px-8 py-2.5 rounded-full border border-[#006728] bg-white text-[#006728] font-bold text-sm"
        >
          {isLastSlide ? "はじめる" : "次へ"}
        </button>
      </div>
    </div>
  );
}
