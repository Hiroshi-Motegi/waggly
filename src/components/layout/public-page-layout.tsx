"use client";

import { useAuth } from "@/hooks/use-auth";
import { PublicPageHeader } from "@/components/layout/public-page-header";


export function PublicPageLayout({
  title,
  backHref,
  backFallbackHref,
  children,
}: {
  title: string;
  backHref?: string;
  backFallbackHref?: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (user) {
    return (
      <div
        className="relative flex flex-col px-2 py-2 space-y-2"
        style={{
          minHeight: "100dvh",
          paddingBottom: "var(--bottom-nav-height)",
          marginBottom: "calc(-1 * var(--bottom-nav-height))",
        }}
      >
        <PublicPageHeader title={title} backHref={backHref} backFallbackHref={backFallbackHref} />
        {children}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex flex-col items-center w-full">
        <PublicPageHeader title={title} backHref={backHref} backFallbackHref={backFallbackHref} />
        <div className="w-full px-3 py-3 space-y-2 overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
