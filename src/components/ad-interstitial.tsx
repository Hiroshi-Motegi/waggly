"use client";

import { useEffect, useState, useRef } from "react";
import { useAdFree } from "@/hooks/use-ad-free";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

// ページ遷移カウンター（モジュールレベル）
let navigationCount = 0;
const SHOW_EVERY_N = 3;

export function useInterstitialAd() {
  const { user } = useAuth();
  const { isAdFree } = useAdFree();

  function shouldShow(): boolean {
    if (!user || isAdFree) return false;
    navigationCount++;
    return navigationCount % SHOW_EVERY_N === 0;
  }

  return { shouldShow, isAdFree };
}

export function AdInterstitial({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!pushed.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/70">
      <div className="bg-white rounded-lg w-[90%] max-w-sm overflow-hidden">
        {/* 広告エリア */}
        <div className="min-h-[250px] flex items-center justify-center">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: "block", width: "100%", height: "250px" }}
            data-ad-client="ca-pub-3196641615749613"
            data-ad-slot=""
            data-ad-format="rectangle"
          />
        </div>

        {/* 閉じるボタン + 広告非表示リンク */}
        <div className="flex items-center justify-between p-3 border-t border-[#ececec]">
          <button
            onClick={() => {
              onClose();
              router.push("/settings/remove-ads");
            }}
            className="text-xs text-[#006728] underline"
          >
            広告を非表示にする
          </button>
          <button
            onClick={onClose}
            disabled={countdown > 0}
            className="px-4 py-1.5 rounded-full bg-[#006728] text-white text-sm font-bold disabled:opacity-40"
          >
            {countdown > 0 ? `${countdown}秒` : "閉じる"}
          </button>
        </div>
      </div>
    </div>
  );
}
