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
    <div className="w-full max-w-screen-sm overflow-x-auto no-scrollbar mt-1">
      <div className="flex bg-black/20 min-w-max">
        {TABS.map((tab) => {
          const isActive = tab.href === "/news" ? pathname === "/news" : pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center justify-center px-3 py-2.5 text-sm font-semibold whitespace-nowrap text-white border-r border-white/40 last:border-r-0 ${
                isActive ? "bg-[#17552f]" : ""
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
