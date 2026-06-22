"use client";

import { createPortal } from "react-dom";
import { useState, useEffect } from "react";

const text = "読み込み中...";

/**
 * Loading indicator with two variants:
 * - "light" (page loading): full-screen overlay via portal, dark bg, white text, always centered
 * - "default" (inline loading): compact, for use inside cards/sections
 */
export function Loading({ variant = "default" }: { variant?: "default" | "light" | "inline-light" }) {
  const isLight = variant === "light" || variant === "inline-light";
  const textColor = isLight ? "text-white" : "text-[#006728]";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ball = (
    <div className="flex flex-col items-center justify-center gap-0">
      <div className="loading-bounce">
        <img
          src={isLight ? "/icons/loading-ball-white.svg" : "/icons/loading-ball.svg"}
          alt=""
          className="h-10 w-10"
        />
      </div>
      <div className="loading-shadow" />
      <div className="flex">
        {text.split("").map((char, i) => (
          <span
            key={i}
            className={`loading-wave text-base font-bold ${textColor}`}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );

  // Inline light: white ball without overlay
  if (variant === "inline-light") {
    return <div className="flex items-center justify-center py-12">{ball}</div>;
  }

  // Page loading: portal to body to escape transform ancestors
  if (isLight) {
    const overlay = (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        {ball}
      </div>
    );
    // SSR safety: portal only after mount
    if (!mounted) return null;
    return createPortal(overlay, document.body);
  }

  // Inline loading: compact with padding
  return <div className="py-12">{ball}</div>;
}
