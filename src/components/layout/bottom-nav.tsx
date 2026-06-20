"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNative } from "@/lib/platform";

const mainTabs = [
  { href: "/", label: "ホーム", icon: "/icons/nav-home.svg" },
  { href: "/bag", label: "マイバッグ", icon: "/icons/nav-bag.svg" },
  { href: "/items", label: "アイテム", icon: "/icons/nav-items.svg" },
  { href: "/practice", label: "練習記録", icon: "/icons/nav-practice.svg" },
];

const extraTabs = [
  { href: "/courses", label: "コースを探す", icon: "/icons/nav-course.svg" },
  { href: "/settings/share", label: "マイ名刺", icon: "/icons/nav-card.svg" },
  { href: "/coach", label: "AI相談", icon: "/icons/nav-ai-chat.svg" },
  { href: "/catalog", label: "クラブカタログ", icon: "/icons/nav-catalog.svg" },
  { href: "/compare", label: "クラブ比較", icon: "/icons/nav-guide.svg" },
  { href: "/news", label: "ニュース", icon: "/icons/nav-news.svg" },
  { href: "/settings", label: "設定", icon: "/icons/nav-settings.svg" },
];

function NavItem({ href, label, icon, isActive, onClick }: {
  href: string; label: string; icon: string; isActive: boolean; onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className="flex flex-col items-center gap-0.5 py-1.5" style={{ width: "20%" }}>
      <Image src={icon} alt={label} width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8" />
      <span className="text-[10px] sm:text-xs font-medium tracking-tight text-black text-center">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (menuOpen) {
      requestAnimationFrame(() => setMenuVisible(true));
    }
  }, [menuOpen]);

  function closeMenu() {
    setMenuVisible(false);
    setTimeout(() => setMenuOpen(false), 200);
  }

  function openMenu() {
    setMenuVisible(false);
    setMenuOpen(true);
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/" && pathname.startsWith(href + "/") && !pathname.startsWith("/coach/plans"));
  }

  return (
    <>
      {menuOpen && (
        <div
          className="fixed inset-0 z-[49]"
          onClick={closeMenu}
        />
      )}

      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-50 px-2 ${isNative() ? "" : "max-w-screen-sm"}`}
        style={{ paddingBottom: "calc(var(--bottom-nav-padding) + env(safe-area-inset-bottom))" }}
      >
        <nav className="bg-white rounded-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.12)] overflow-hidden">
          {/* Main row */}
          <div className={`flex items-center justify-around ${menuOpen ? "pt-3" : "pt-0.5"}`}>
            {mainTabs.map((tab) => (
              <NavItem
                key={tab.href}
                href={tab.href}
                label={tab.label}
                icon={tab.icon}
                isActive={isActive(tab.href)}
              />
            ))}
            <button
              onClick={menuOpen ? closeMenu : openMenu}
              className="flex flex-col items-center gap-0.5 py-1.5"
              style={{ width: "20%" }}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            >
              {menuOpen ? (
                <>
                  <Image src="/icons/nav-close.svg" alt="閉じる" width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8" />
                  <span className="text-[10px] sm:text-xs font-medium tracking-tight text-black">閉じる</span>
                </>
              ) : (
                <>
                  <Image src="/icons/nav-menu.svg" alt="メニュー" width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8" />
                  <span className="text-[10px] sm:text-xs font-medium tracking-tight text-black">メニュー</span>
                </>
              )}
            </button>
          </div>

          {/* Extra rows - expand inside the same nav box */}
          <div
            className={`transition-all duration-200 ease-out overflow-hidden ${
              menuOpen && menuVisible ? "max-h-[300px]" : "max-h-0"
            }`}
            aria-hidden={!menuOpen || !menuVisible}
          >
            <div className="flex flex-wrap pt-4 pb-3 gap-y-2">
              {extraTabs.map((tab) => (
                <NavItem
                  key={tab.href}
                  href={tab.href}
                  label={tab.label}
                  icon={tab.icon}
                  isActive={isActive(tab.href)}
                  onClick={closeMenu}
                />
              ))}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
