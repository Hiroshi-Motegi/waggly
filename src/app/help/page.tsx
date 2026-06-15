"use client";

import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";

export default function HelpIndexPage() {
  const items = [
    { href: "/help/account-linking", label: "アカウント連携について" },
    { href: "/help/plans", label: "プランについて" },
    { href: "/help/ads", label: "広告表示について" },
    { href: "/help/golfer-card", label: "ゴルファー名刺について" },
    { href: "/help/delete-account", label: "データの削除・退会について" },
    { href: "/help/contact", label: "お問い合わせ" },
  ];

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2">
      <div className="relative flex flex-col space-y-2">
        <PageHeader title="ご利用ガイド" variant="dark" />

        <div className="rounded-lg bg-white p-3">
          <div className="flex flex-col">
            {items.map((item, i) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-2.5 py-2.5 ${
                    i < items.length - 1 ? "border-b border-[#dfdfdf]" : ""
                  }`}
                >
                  <span className="flex-1 text-base font-bold">
                    {item.label}
                  </span>
                  <Image
                    src="/icons/chevron-right.svg"
                    alt=""
                    width={6}
                    height={10}
                    className="opacity-60"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
