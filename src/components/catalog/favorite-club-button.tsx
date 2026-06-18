"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useFavoriteClubs } from "@/hooks/use-favorite-clubs";

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
            <p className="text-sm text-[#666] mb-4">お気に入りに登録するには会員登録・ログインが必要です。</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLoginPrompt(false)} className="flex-1 rounded-full border border-[#ccc] py-2 text-sm font-bold text-[#666]">
                閉じる
              </button>
              <a href="/auth/login" className="flex-1 rounded-full bg-[#006728] py-2 text-sm font-bold text-white text-center">
                ログイン
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
