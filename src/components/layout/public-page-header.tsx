"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/layout/back-button";
import { PublicMenuButton } from "@/components/layout/public-menu";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { LoginPromoBanner } from "@/components/catalog/login-promo-banner";

export function PublicPageHeader({ title, backHref, backFallbackHref }: { title: string; backHref?: string; backFallbackHref?: string }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (user) return;
    function onScroll() { setScrolled(window.scrollY > 10); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [user]);

  if (user) {
    return <PageHeader title={title} variant="dark" backHref={backHref} backFallbackHref={backFallbackHref} />;
  }

  return (
    <>
      <div className="sticky top-0 z-40 w-full relative">
        <div className="absolute inset-0" style={{ background: "#7cb668 url(/images/home-bg.jpg) center / cover fixed", backgroundBlendMode: "soft-light" }} />
        <div className="absolute inset-0 bg-black/20" />
        <div className="flex items-center justify-center w-full max-w-screen-sm relative py-3 px-3 mx-auto">
          <BackButton fallbackHref={backHref ?? backFallbackHref ?? "/"} />
          <Link href="/"><Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} /></Link>
          <div className="absolute right-3 flex items-center gap-2">
            <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="p-1"><Image src="/icons/user-icon-w.svg" alt="ログイン" width={28} height={28} /></Link>
            <PublicMenuButton />
          </div>
        </div>
        <LoginPromoBanner />
      </div>
      <div className="w-full bg-black/40 py-3">
        <h1 className="text-sm font-bold text-white text-center">{title}</h1>
      </div>
    </>
  );
}
