"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

function shouldUseFallback(): boolean {
  try {
    const prev = sessionStorage.getItem("nav_prev_path");
    // No prev = first page in session (external link or direct access)
    if (!prev) return true;
    // Block login/auth paths
    if (prev === "/login" || prev.startsWith("/auth/")) return true;
    return false;
  } catch {
    return true;
  }
}

export function BackButton({ fallbackHref }: { fallbackHref?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (shouldUseFallback() || window.history.length <= 1) {
          router.push(fallbackHref ?? "/");
        } else {
          router.back();
        }
      }}
      className="absolute left-3 p-1"
    >
      <ChevronLeft className="h-5 w-5 text-white" />
    </button>
  );
}
