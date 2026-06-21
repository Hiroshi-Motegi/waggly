"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "login_promo_dismissed";

export function LoginPromoBanner() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (!dismissedAt || Date.now() - Number(dismissedAt) > 86400000) {
      localStorage.removeItem(STORAGE_KEY);
      setDismissed(false);
      setTimeout(() => {
        setVisible(true);
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      }, 1500);
    }
  }, []);

  useEffect(() => {
    function onScroll() { setHidden(window.scrollY > 50); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (user || dismissed) return null;
  if (!pathname.startsWith("/catalog") && !pathname.startsWith("/compare")) return null;

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setDismissed(true);
  }

  return (
    <div
      className="absolute left-3 right-3 z-50 transition-opacity duration-700"
      style={{
        top: "100%",
        animation: hidden ? "none" : "gentle-bounce 2s ease-in-out infinite",
        opacity: hidden || !visible ? 0 : 1,
        pointerEvents: hidden || !visible ? "none" : "auto",
      }}
    >
      <div className="flex justify-end">
        <div className="relative" style={{ width: "min(320px, 100%)" }}>
          {/* Triangle pointing to login icon */}
          <div
            className="w-0 h-0 absolute right-[48px] top-0"
            style={{
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderBottom: "10px solid #ffc107",
            }}
          />
          <Link href="/#features" onClick={handleDismiss}>
            <div className="bg-[#ffc107] rounded-lg px-3 py-2.5 relative shadow-lg mt-[10px]">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="absolute top-1.5 right-1.5 text-[#382300]/60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="text-xs font-medium text-[#382300] text-center tracking-tight mb-2 pr-3">
                LINE/Googleログインで様々な機能を利用できます
              </p>
              <div className="flex gap-1.5">
                {[
                  { icon: "/icons/nav-bag-w.svg", label: "マイクラブ管理" },
                  { icon: "/icons/nav-practice-w.svg", label: "練習管理" },
                  { icon: "/icons/business-card-w.svg", label: "ゴルファー名刺" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex-1 flex flex-col items-center gap-1 bg-[#382300] rounded py-1.5"
                  >
                    <Image src={item.icon} alt="" width={24} height={24} />
                    <span className="text-[10px] font-medium text-white">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
