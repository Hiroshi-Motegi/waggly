"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackButton({ fallbackHref }: { fallbackHref?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else if (fallbackHref) {
          router.push(fallbackHref);
        }
      }}
      className="absolute left-3 p-1"
    >
      <ChevronLeft className="h-5 w-5 text-white" />
    </button>
  );
}
