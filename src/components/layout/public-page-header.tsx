"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/layout/back-button";
import { PublicMenuButton } from "@/components/layout/public-menu";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";

export function PublicPageHeader({ title, backHref }: { title: string; backHref?: string }) {
  const { user } = useAuth();
  const pathname = usePathname();

  if (user) {
    return <PageHeader title={title} variant="dark" backHref={backHref} />;
  }

  return (
    <>
      <div className="flex items-center justify-center w-full max-w-screen-sm relative py-3 px-3">
        <BackButton fallbackHref={backHref ?? "/"} />
        <Link href="/"><Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} /></Link>
        <div className="absolute right-3 flex items-center gap-2">
          <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="p-1"><Image src="/icons/user-icon-w.svg" alt="ログイン" width={28} height={28} /></Link>
          <PublicMenuButton />
        </div>
      </div>
      <div className="w-full bg-black/40 py-3">
        <h1 className="text-sm font-bold text-white text-center">{title}</h1>
      </div>
    </>
  );
}
