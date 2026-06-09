"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  showBack?: boolean;
  variant?: "default" | "dark";
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backHref, showBack = true, variant = "default", children }: PageHeaderProps) {
  const router = useRouter();
  const isDark = variant === "dark";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isDark) return;
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isDark]);

  function handleBack() {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }

  return (
    <div className={`sticky top-0 z-10 -mx-2 -mt-2 px-3 pt-4 pb-2 overflow-hidden transition-all duration-200 ${isDark ? (scrolled ? "shadow-sm" : "") : "bg-[#ebf1eb]"}`}>
      {isDark && scrolled && (
        <>
          <div className="absolute inset-0 bg-[#139847]/80" />
          <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none" />
        </>
      )}
      <div className="relative z-10 flex items-center gap-2">
        {showBack && (
          <button onClick={handleBack} className="shrink-0 -ml-1 p-1">
            <ChevronLeft className={`h-5 w-5 ${isDark ? "text-white" : "text-[#006728]"}`} />
          </button>
        )}
        <div className="flex flex-1 flex-col min-w-0">
          {subtitle && (
            <span className={`text-xs font-bold truncate ${isDark ? "text-white/80" : "text-[#1e944c]"}`}>{subtitle}</span>
          )}
          <h2 className={`text-lg font-bold truncate ${isDark ? "text-white" : "text-[#006728]"}`}>{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}
