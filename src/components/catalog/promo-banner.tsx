"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

export function PromoBanner() {
  const { user } = useAuth();
  if (user) return null;

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-screen-sm z-40 px-2"
      style={{ paddingBottom: "calc(var(--bottom-nav-padding) + env(safe-area-inset-bottom))" }}
    >
      <Link href="/" className="block w-full max-w-sm mx-auto rounded-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.12)] overflow-hidden">
        <Image
          src="/banner/vs_banner.png"
          alt="自分のクラブセットを管理 ゴルファー名刺にしませんか？"
          width={480}
          height={84}
          priority
          className="w-full h-auto"
        />
      </Link>
    </div>
  );
}
