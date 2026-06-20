"use client";

import { useState } from "react";
import { termsSections, TERMS_LAST_UPDATED } from "@/lib/terms-content";

interface TermsAgreementProps {
  onAgree: () => void;
  isReagreement?: boolean;
}

export function TermsAgreement({ onAgree, isReagreement }: TermsAgreementProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="flex flex-col items-center px-6 pt-8 pb-4 text-center">
        <img
          src="/images/onboarding/waggly-ball.svg"
          alt="Waggly"
          width={80}
          height={80}
          className="mb-4"
          style={{ animation: "smallBounce 1.2s ease-in-out infinite" }}
        />
        {isReagreement ? (
          <p className="text-base font-bold text-[#2c2c2c] leading-relaxed">
            利用規約が更新されました。
            <br />
            下記利用規約をご確認ください。
          </p>
        ) : (
          <p className="text-base font-bold text-[#2c2c2c] leading-relaxed">
            ワグリーを利用するには利用規約の同意が必要です。
            <br />
            下記利用規約をご確認ください。
          </p>
        )}
      </div>

      {/* 利用規約インライン表示 */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <h3 className="text-base font-bold mb-2">利用規約</h3>
        <p className="text-xs text-[#8b8b8b] mb-3">最終更新日: {TERMS_LAST_UPDATED}</p>
        <div className="space-y-3">
          {termsSections.map((section, i) => (
            <div key={i} className="space-y-0.5">
              <h4 className="text-sm font-bold">{section.title}</h4>
              {section.blocks.map((block, j) =>
                block.type === "text" ? (
                  <p key={j} className="text-sm text-[#666] leading-relaxed">{block.content}</p>
                ) : (
                  <ul key={j} className="list-disc pl-4 space-y-0.5">
                    {block.items.map((item, k) => (
                      <li key={k} className="text-sm text-[#666] leading-relaxed">{item}</li>
                    ))}
                  </ul>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 同意 + ボタン — オンボーディングと同じデザイン */}
      <div className="sticky bottom-0 left-0 right-0 z-50 py-3 flex flex-col items-center gap-3 overflow-hidden"
        style={{ background: "#7cb668 url(/images/home-bg.jpg) center / cover fixed", backgroundBlendMode: "soft-light" }}
      >
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        <label className="relative flex items-center justify-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-5 w-5 rounded accent-[#006728]"
          />
          <span className="text-white">利用規約に同意します</span>
        </label>
        <button
          disabled={!agreed}
          onClick={onAgree}
          className="relative px-8 py-2.5 rounded-full border border-[#006728] bg-white text-[#006728] font-bold text-sm disabled:opacity-40"
        >
          はじめる
        </button>
      </div>
    </div>
  );
}
