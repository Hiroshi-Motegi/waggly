"use client";

import { useEffect, useRef } from "react";
import { useAdFree } from "@/hooks/use-ad-free";
import { useAuth } from "@/hooks/use-auth";

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

/**
 * AdSense バナー広告
 * Pro ユーザーまたは ad_free 購入済みユーザーには表示しない
 */
export function AdBanner({ slot, format = "auto" }: { slot: string; format?: string }) {
  const { user } = useAuth();
  const { isAdFree } = useAdFree();
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (isAdFree || !user || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}
  }, [isAdFree, user]);

  if (!user || isAdFree) return null;

  return (
    <div className="w-full overflow-hidden">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-3196641615749613"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
