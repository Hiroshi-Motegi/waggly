"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie_consent";

export function CookieConsent({ hasBottomNav = false }: { hasBottomNav?: boolean }) {
  const [state, setState] = useState<"loading" | "show" | "hidden">("loading");

  useEffect(() => {
    setState(localStorage.getItem(STORAGE_KEY) ? "hidden" : "show");
  }, []);

  if (state !== "show") return null;

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, "true");
    setState("hidden");
  }

  return (
    <div className={`fixed left-1/2 -translate-x-1/2 z-[200] w-full max-w-screen-sm px-2 animate-fade-in ${hasBottomNav ? "" : "bottom-4"}`} style={hasBottomNav ? { bottom: "calc(var(--bottom-nav-height) + 16px)" } : undefined}>
      <div className="bg-white shadow-lg px-4 py-3 flex items-center gap-3 rounded-xl">
        <p className="flex-1 text-xs text-[#666] leading-relaxed">
          当サイトではCookieを使用しています。詳しくは
          <Link href="/privacy" className="text-[#006728] underline">プライバシーポリシー</Link>
          をご覧ください。
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 px-4 py-1.5 rounded-full bg-[#006728] text-white text-sm font-bold"
        >
          同意する
        </button>
      </div>
    </div>
  );
}
