"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    title: "Wagglyへようこそ",
    description: "ゴルフクラブを管理し、練習日記とAIで上達をサポートするアプリです。",
    icon: "🏌️",
  },
  {
    title: "マイバッグ",
    description: "あなたのクラブセットを登録。スペック、購入情報、メンテナンス履歴を一元管理できます。",
    icon: "🎒",
  },
  {
    title: "練習記録",
    description: "練習場での球数や気づきをサクッと記録。番手別の練習量も簡単に入力できます。",
    icon: "📝",
  },
  {
    title: "AIコーチ",
    description: "あなたのクラブと練習データを踏まえて、AIがアドバイスや練習メニューを提案します。",
    icon: "💬",
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [agreed, setAgreed] = useState(false);

  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];

  function handleNext() {
    if (isLastSlide) return;
    setCurrentSlide(currentSlide + 1);
  }

  function handleStart() {
    if (!agreed) return;
    onComplete();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 py-10 bg-background">
      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm">
        <span className="text-6xl mb-6">{slide.icon}</span>
        <h2 className="text-2xl font-bold mb-3">{slide.title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{slide.description}</p>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mb-8">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === currentSlide ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-4">
        {isLastSlide ? (
          <>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-input accent-primary"
              />
              <span className="text-muted-foreground">
                <Link href="/terms" className="underline" target="_blank">利用規約</Link>
                に同意します
              </span>
            </label>
            <Button className="w-full" size="lg" disabled={!agreed} onClick={handleStart}>
              はじめる
            </Button>
          </>
        ) : (
          <Button className="w-full" size="lg" onClick={handleNext}>
            次へ
          </Button>
        )}
      </div>
    </div>
  );
}
