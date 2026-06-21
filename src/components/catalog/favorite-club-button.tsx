"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useFavoriteClubs } from "@/hooks/use-favorite-clubs";
import { trackEvent } from "@/lib/gtm";

export function FavoriteClubButton({ modelId }: { modelId: string }) {
  const { user } = useAuth();
  const { favoriteModelIds, toggle } = useFavoriteClubs();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const isFav = favoriteModelIds.has(modelId);

  function handleClick() {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    toggle(modelId);
    if (!isFav) trackEvent("catalog_favorited", { model_id: modelId });
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center justify-center rounded-full bg-white h-[40px] w-[40px] shadow-sm"
      >
        <Heart className={`h-5 w-5 ${isFav ? "fill-red-500 text-red-500" : "text-[#006728]"}`} />
      </button>

      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowLoginPrompt(false)}>
          <div className="bg-white rounded-xl p-6 mx-4 max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold text-[#222] mb-2">お気に入り登録</p>
            <p className="text-sm text-[#666] mb-4">LINE または Google でログインすると、お気に入り・マイバッグ・練習記録が使えます。</p>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <a href="/#features" className="flex-1 rounded-full border border-[#006728] py-2.5 text-sm font-bold text-[#006728] text-center">
                  できることを見る
                </a>
                <a href={`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="flex-1 rounded-full bg-[#006728] py-2.5 text-sm font-bold text-white text-center">
                  ログイン
                </a>
              </div>
              <button onClick={() => setShowLoginPrompt(false)} className="text-sm text-[#999] text-center">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
