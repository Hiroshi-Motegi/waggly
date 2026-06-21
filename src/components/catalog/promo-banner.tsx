"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "promo_banner_dismissed";

export function PromoBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (!dismissedAt || Date.now() - Number(dismissedAt) > 86400000) {
      localStorage.removeItem(STORAGE_KEY);
      setDismissed(false);
      setTimeout(() => setVisible(true), 2000);
    }
  }, []);

  if (user || dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setDismissed(true);
  }

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-full max-w-screen-sm z-40 px-2 transition-all duration-500"
      style={{
        paddingBottom: "calc(var(--bottom-nav-padding) + env(safe-area-inset-bottom))",
        bottom: visible ? 0 : "-100px",
      }}
    >
      <div className="relative w-full max-w-sm mx-auto">
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-1 z-10 bg-black/60 rounded-full p-0.5"
        >
          <X className="h-4 w-4 text-white" />
        </button>
        <Link href="/" className="block rounded-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.12)] overflow-hidden">
          <Image
            src="/banner/vs_banner.png"
            alt="自分のクラブセットを管理 ゴルファー名刺にしませんか？"
            width={480}
            height={84}
            priority
            className="w-full h-auto"
          />
        </Link>
      </div>
    </div>
  );
}
