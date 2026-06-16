"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/gtm";

export function LimitReachedCard() {
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackEvent("ai_limit_reached");
    }
  }, []);

  return (
    <div className="bg-white/90 rounded-lg p-4 text-center space-y-3">
      <p className="text-sm font-bold text-[#2c2c2c]">
        今月の利用上限に達しました
      </p>
      <Link
        href="/settings/plan"
        className="inline-block px-6 py-2 rounded-full bg-[#006728] text-white text-sm font-bold"
      >
        Waggly Proにアップグレード
      </Link>
    </div>
  );
}
