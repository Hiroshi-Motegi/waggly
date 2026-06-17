"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie_consent";
const CONSENT_KEY = "waggly_consent_v1";

export function CookieConsent({ hasBottomNav = false }: { hasBottomNav?: boolean }) {
  const [state, setState] = useState<"loading" | "show" | "hidden">("loading");
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(CONSENT_KEY);
    setState(accepted ? "hidden" : "show");
  }, []);

  useEffect(() => {
    if (state !== "show") {
      document.body.style.paddingBottom = "";
      return;
    }
    function updatePadding() {
      const h = bannerRef.current?.offsetHeight ?? 0;
      document.body.style.paddingBottom = `${h}px`;
    }
    updatePadding();
    window.addEventListener("resize", updatePadding);
    return () => {
      document.body.style.paddingBottom = "";
      window.removeEventListener("resize", updatePadding);
    };
  }, [state]);

  if (state !== "show") return null;

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    setState("hidden");
  }

  return (
    <div
      ref={bannerRef}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[300] w-full max-w-screen-sm animate-fade-in"
      style={hasBottomNav ? { bottom: "var(--bottom-nav-height)" } : undefined}
    >
      <div className="bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] rounded-t-xl px-5 py-5">
        <p className="text-sm font-bold text-[#222] mb-2">ご利用にあたって</p>
        <ul className="text-xs text-[#555] leading-relaxed space-y-1.5 mb-4">
          <li>
            ・本サイトでは、利便性向上のためCookieを使用しています。詳しくは<Link href="/privacy" className="text-[#006728] underline">プライバシーポリシー</Link>をご覧ください。
          </li>
          <li>
            ・スペック・関連情報の収集にはAIを利用しており、内容が正確でない場合があります。正確な情報はメーカー公式サイトにてご確認をお願いいたします。
          </li>
        </ul>
        <button
          onClick={handleAccept}
          className="w-full rounded-full bg-[#006728] py-3 text-sm font-bold text-white"
        >
          上記に同意して利用する
        </button>
      </div>
    </div>
  );
}
