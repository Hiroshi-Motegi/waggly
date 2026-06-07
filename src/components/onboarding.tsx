"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface OnboardingProps {
  onComplete: () => void;
  isReagreement?: boolean;
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

const termsContent = [
  { title: "第1条（サービス内容）", body: "Waggly（以下「本サービス」）は、ゴルフクラブの管理、練習記録、AIによるアドバイス機能を提供するWebアプリケーションです。" },
  { title: "第2条（AI機能について）", body: "本サービスのAIコーチ機能はベータ版として提供しています。AIの回答は一般的な情報に基づくものであり、正確性を保証するものではありません。ゴルフの指導やクラブ選びの最終判断はご自身で行ってください。" },
  { title: "第3条（個人情報の取り扱い）", body: "本サービスでは、LINEアカウント情報（表示名・プロフィール画像）、登録されたクラブ情報、練習記録、AIとの会話履歴を保存します。これらの情報はサービス提供の目的のみに使用し、第三者への提供は行いません。" },
  { title: "第4条（禁止事項）", body: "本サービスへの不正アクセスや過度な負荷をかける行為、AI機能を本来の目的以外で利用する行為、他のユーザーに迷惑をかける行為を禁止します。" },
  { title: "第5条（免責事項）", body: "本サービスは現状有姿で提供され、特定の目的への適合性を保証しません。本サービスの利用により生じた損害について、運営者は一切の責任を負いません。" },
  { title: "第6条（サービスの変更・停止）", body: "運営者は、事前の通知なくサービス内容の変更、または提供の停止を行うことがあります。" },
  { title: "第7条（規約の変更）", body: "本規約は予告なく変更することがあります。変更後の規約は本ページに掲載した時点で効力を生じます。" },
];

export function Onboarding({ onComplete, isReagreement }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(isReagreement ? slides.length - 1 : 0);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

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

  // Terms view
  if (showTerms) {
    return (
      <div className="flex flex-col min-h-dvh bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold">利用規約</span>
          <button
            onClick={() => setShowTerms(false)}
            className="text-sm text-primary"
          >
            戻る
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">最終更新日: 2026年6月8日</p>
          {termsContent.map((section, i) => (
            <div key={i} className="space-y-1">
              <h3 className="font-semibold">{section.title}</h3>
              <p className="text-muted-foreground">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Slides view
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 py-10 bg-background">
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm">
        {isReagreement && isLastSlide ? (
          <>
            <span className="text-6xl mb-6">📋</span>
            <h2 className="text-2xl font-bold mb-3">利用規約が更新されました</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">引き続きご利用いただくには、更新された利用規約への同意が必要です。</p>
          </>
        ) : (
          <>
            <span className="text-6xl mb-6">{slide.icon}</span>
            <h2 className="text-2xl font-bold mb-3">{slide.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{slide.description}</p>
          </>
        )}
      </div>

      {/* Dots */}
      {!isReagreement && (
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
      )}

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
                <button onClick={() => setShowTerms(true)} className="underline">利用規約</button>
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
