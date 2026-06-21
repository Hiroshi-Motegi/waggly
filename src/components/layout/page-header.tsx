"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  /** When set, prefer browser back and only use this href as fallback for direct access */
  backFallbackHref?: string;
  showBack?: boolean;
  variant?: "default" | "dark";
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backHref, backFallbackHref, showBack = true, variant = "default", children }: PageHeaderProps) {
  const router = useRouter();
  const isDark = variant === "dark";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isDark) return;
    let rafId: number;
    function onScroll() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 10);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [isDark]);

  function handleBack() {
    // backHrefが明示指定されている場合は常にそれを使う
    // （OAuth遷移後など、ブラウザ履歴が外部サイトを含む場合にrouter.back()は予測不能）
    if (backHref) {
      router.push(backHref);
      return;
    }

    const blocked = (() => {
      try {
        const prev = sessionStorage.getItem("nav_prev_path");
        if (!prev) return true;
        if (prev === "/login" || prev.startsWith("/auth/")) return true;
        return false;
      } catch { return true; }
    })();

    if (blocked || window.history.length <= 1) {
      router.push(backFallbackHref ?? "/");
    } else {
      router.back();
    }
  }

  return (
    <div
      className={`sticky top-0 z-20 -mx-2 -mt-2 px-3 pt-4 pb-2 overflow-hidden transition-all duration-200 ${isDark ? (scrolled ? "shadow-sm" : "") : "bg-[#ebf1eb]"}`}
      style={isDark ? { background: "#7cb668 url(/images/home-bg.jpg) center / cover fixed", backgroundBlendMode: "soft-light" } : undefined}
    >
      {isDark && <div className="absolute inset-0 bg-black/20 pointer-events-none" />}
      <div className="relative z-10 flex items-center gap-2 min-h-[52px]">
        {showBack && (
          <button onClick={handleBack} className="shrink-0 -ml-1 p-1">
            <ChevronLeft className={`h-5 w-5 ${isDark ? "text-white" : "text-[#006728]"}`} />
          </button>
        )}
        <div className="flex flex-1 flex-col min-w-0">
          {subtitle && (
            <span className={`text-sm font-bold truncate ${isDark ? "text-white/80" : "text-[#1e944c]"}`}>{subtitle}</span>
          )}
          <h2 className={`text-lg font-bold truncate ${isDark ? "text-white" : "text-[#006728]"}`}>{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}
