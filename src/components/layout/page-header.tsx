"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  showBack?: boolean;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backHref, showBack = true, children }: PageHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-[#ebf1eb] flex items-center gap-2 px-1 py-2">
      {showBack && (
        <button onClick={handleBack} className="shrink-0 -ml-1 p-1">
          <ChevronLeft className="h-5 w-5 text-[#006728]" />
        </button>
      )}
      <div className="flex flex-1 flex-col min-w-0">
        {subtitle && (
          <span className="text-xs font-bold text-[#1e944c] truncate">{subtitle}</span>
        )}
        <h2 className="text-lg font-bold text-[#006728] truncate">{title}</h2>
      </div>
      {children}
    </div>
  );
}
