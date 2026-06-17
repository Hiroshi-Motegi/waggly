"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

export function PromoBanner() {
  const { user } = useAuth();
  if (user) return null;

  return (
    <Link href="/" target="_blank" className="block w-full max-w-screen-sm border-y-2 border-white">
      <Image
        src="/banner/vs_banner.png"
        alt="自分のクラブセットを管理 ゴルファー名刺にしませんか？"
        width={480}
        height={84}
        className="w-full h-auto"
      />
    </Link>
  );
}
