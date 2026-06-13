"use client";

import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";

export default function HelpIndexPage() {
  const items = [
    { href: "/help/account-linking", label: "アカウント連携について" },
  ];

  return (
    <div
      className="relative flex flex-col px-2 py-2 space-y-2"
      style={{
        minHeight: "100dvh",
        paddingBottom: "var(--bottom-nav-height)",
        marginBottom: "calc(-1 * var(--bottom-nav-height))",
      }}
    >
      <img
        src="/images/home-bg.jpg"
        alt=""
        className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
      />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="ヘルプ" variant="dark" />

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
