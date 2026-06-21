"use client";

import Image from "next/image";
import Link from "next/link";
import { PublicPageLayout } from "@/components/layout/public-page-layout";

export default function HelpIndexPage() {
  const items = [
    { href: "/help/account-linking", label: "アカウント連携について" },
    { href: "/help/plans", label: "プランについて" },
    { href: "/help/ads", label: "広告表示について" },
    { href: "/help/golfer-card", label: "ゴルファー名刺について" },
    { href: "/help/catalog", label: "クラブカタログ・比較について" },
    { href: "/help/ai", label: "AI機能について" },
    { href: "/help/delete-account", label: "データの削除・退会について" },
    { href: "/help/contact", label: "お問い合わせ" },
  ];

  return (
    <PublicPageLayout title="ご利用ガイド">
      <div className="rounded-lg bg-white p-3">
        <div className="flex flex-col">
          {items.map((item, i) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-2.5 py-2.5 ${
                  i < items.length - 1 ? "border-b border-[#dfdfdf]" : ""
                }`}
              >
                <span className="flex-1 text-base">
                  {item.label}
                </span>
                <Image
                  src="/icons/chevron-right.svg"
                  alt=""
                  width={6}
                  height={10}
                  className="opacity-60"
                  style={{ width: "auto", height: "auto" }}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PublicPageLayout>
  );
}
