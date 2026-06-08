"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  showBack?: boolean;
  /** "dark" for green bg pages (white text), default for normal pages */
  variant?: "default" | "dark";
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backHref, showBack = true, variant = "default", children }: PageHeaderProps) {
  const router = useRouter();
  const isDark = variant === "dark";

  function handleBack() {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }

  return (
    <div className={`sticky top-0 z-10 flex items-center gap-2 -mx-2 -mt-2 px-3 py-1 ${isDark ? "bg-[#139847]/80 backdrop-blur-sm" : "bg-[#ebf1eb]"}`}>
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
  );
}
