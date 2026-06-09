"use client";

import { useState } from "react";
import { Share2, Download, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface Props {
  bagNumber: number;
}

export function ShareWitbButton({ bagNumber }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function generateImage() {
    setIsLoading(true);
    setIsOpen(true);
    try {
      const res = await apiFetch(`/api/bag/witb-image?bag=${bagNumber}`);
      if (!res.ok) throw new Error("Failed to generate image");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownload() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `waggly-witb-bag${bagNumber}.png`;
    a.click();
  }

  async function handleShare() {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `waggly-witb-bag${bagNumber}.png`, { type: "image/png" });
      if (navigator.share) {
        await navigator.share({ files: [file], title: "My Golf Bag - Waggly" });
      } else {
        handleDownload();
      }
    } catch (e) {
      handleDownload();
    }
  }

  function handleClose() {
    setIsOpen(false);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
  }

  return (
    <>
      <button
        onClick={generateImage}
        className="flex items-center gap-1 rounded-full border border-[#006728] bg-white px-3 py-1.5 text-sm font-bold text-[#006728]"
      >
        <Share2 className="h-3.5 w-3.5" />
        WITB画像
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
          <div className="relative w-full max-w-lg rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleClose} className="absolute right-3 top-3 text-[#8b8b8b]">
              <X className="h-5 w-5" />
            </button>
            <p className="mb-3 text-base font-bold">セッティング画像</p>
            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <p className="text-base text-[#8b8b8b]">画像を生成中...</p>
              </div>
            ) : imageUrl ? (
              <>
                <img src={imageUrl} alt="WITB" className="w-full rounded-lg" />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#006728] py-2.5 text-base font-bold text-white"
                  >
                    <Download className="h-4 w-4" />
                    ダウンロード
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full border border-[#006728] py-2.5 text-base font-bold text-[#006728]"
                  >
                    <Share2 className="h-4 w-4" />
                    シェア
                  </button>
                </div>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <p className="text-base text-[#e74c3c]">画像の生成に失敗しました</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
