"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "ホーム", icon: "/icons/nav-home.svg" },
  { href: "/bag", label: "マイバッグ", icon: "/icons/nav-bag.svg" },
  { href: "/items", label: "アイテム", icon: "/icons/nav-items.svg" },
  { href: "/practice", label: "練習記録", icon: "/icons/nav-practice.svg" },
  { href: "/coach", label: "AIに相談", icon: "/icons/nav-ai.svg" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <nav className="flex items-center justify-around bg-white rounded-lg pt-0.5 pb-1.5 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/" && pathname.startsWith(tab.href + "/") && !pathname.startsWith("/coach/plans"));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <div
                className={`h-[5px] w-[29px] rounded-b-full ${
                  isActive ? "bg-[#009610]" : "bg-transparent"
                }`}
              />
              <div className="flex flex-col items-center gap-0.5">
                <Image
                  src={tab.icon}
                  alt={tab.label}
                  width={28}
                  height={28}
                />
                <span className="text-[10px] font-medium tracking-tight text-black">
                  {tab.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
