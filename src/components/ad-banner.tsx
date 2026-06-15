"use client";

import { useEffect, useRef, useState } from "react";
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
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (isAdFree || !user || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}

    // AdSense が広告を埋めたか監視（未承認時は空 iframe になるため）
    const el = adRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      const ins = el.querySelector("ins.adsbygoogle");
      if (ins && (ins as HTMLElement).dataset.adStatus === "filled") {
        setFilled(true);
        observer.disconnect();
      }
    });
    observer.observe(el, { subtree: true, attributes: true, attributeFilter: ["data-ad-status"] });
    return () => observer.disconnect();
  }, [isAdFree, user]);

  if (!user || isAdFree) return null;

  return (
    <div ref={adRef} className="w-full overflow-hidden" style={{ display: filled ? "block" : "none" }}>
      <ins
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
