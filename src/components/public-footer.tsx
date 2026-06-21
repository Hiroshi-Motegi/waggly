"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

export function PublicFooter({ withBannerPadding }: { withBannerPadding?: boolean }) {
  const { user } = useAuth();
  const [showPadding, setShowPadding] = useState(false);

  useEffect(() => {
    if (!withBannerPadding || user) return;
    const dismissedAt = localStorage.getItem("promo_banner_dismissed");
    if (!dismissedAt || Date.now() - Number(dismissedAt) > 86400000) {
      setShowPadding(true);
    }
  }, [withBannerPadding, user]);

  return (
    <footer className={`w-full border-t border-white/15 bg-black/10 backdrop-blur-sm mt-auto${showPadding ? " pb-20" : ""}`}>
      <div className="max-w-sm mx-auto px-4 pt-10 pb-6 space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Link href="/terms" className="text-sm text-white/60 hover:text-white/90">利用規約</Link>
          <Link href="/privacy" className="text-sm text-white/60 hover:text-white/90">プライバシーポリシー</Link>
          <Link href="/legal" className="text-sm text-white/60 hover:text-white/90 whitespace-nowrap">特定商取引法に基づく表記</Link>
          <Link href="/help" className="text-sm text-white/60 hover:text-white/90">ご利用ガイド</Link>
          <Link href="/help/contact" className="text-sm text-white/60 hover:text-white/90">お問い合わせ</Link>
        </div>
        <p className="text-xs text-white/30 text-center">&copy; cocoroe</p>
      </div>
    </footer>
  );
}
