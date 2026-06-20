"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/news", label: "すべて" },
  { href: "/news/driver", label: "ドライバー" },
  { href: "/news/fairway_wood", label: "FW" },
  { href: "/news/utility", label: "UT" },
  { href: "/news/iron", label: "アイアン" },
  { href: "/news/wedge", label: "ウェッジ" },
  { href: "/news/putter", label: "パター" },
];

export function NewsTabBar() {
  const pathname = usePathname();

  return (
    <div className="w-full max-w-screen-sm overflow-x-auto no-scrollbar">
      <div className="flex min-w-max px-3 pt-3">
        {TABS.map((tab) => {
          const isActive = tab.href === "/news" ? pathname === "/news" : pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-white text-white"
                  : "border-transparent text-white/50 hover:text-white/70"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
