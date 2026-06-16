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
    } catch (e) {
      console.warn("AdSense push failed:", e);
    }

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
    <>
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
      {/* AdSense未承認時のフォールバック（A8 アルペン） */}
      {!filled && (
        <div className="flex justify-center py-2 max-w-sm mx-auto">
          <a href="https://px.a8.net/svt/ejp?a8mat=4B5X8H+6G750Q+3OSK+644DT" rel="nofollow" target="_blank">
            <img width="300" height="250" alt="" src="https://www23.a8.net/svt/bgt?aid=260616833390&wid=004&eno=01&mid=s00000017210001027000&mc=1" />
          </a>
          <img width="1" height="1" src="https://www15.a8.net/0.gif?a8mat=4B5X8H+6G750Q+3OSK+644DT" alt="" />
        </div>
      )}
    </>
  );
}
