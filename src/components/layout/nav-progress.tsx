"use client";

import { useEffect, useState, useRef, createContext, useContext } from "react";
import { usePathname } from "next/navigation";

const LOADING_TEXT = "読み込み中...";

// Context to share navigating state
const NavCtx = createContext(false);
export function useNavigating() { return useContext(NavCtx); }

export function NavProgress({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const prevPath = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      setProgress(100);
      setNavigating(false);
      setExiting(true);
      if (timerRef.current) clearInterval(timerRef.current);
      const t1 = setTimeout(() => setProgress(0), 200);
      const t2 = setTimeout(() => { setExiting(false); setShowOverlay(false); }, 200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (href === pathname) return;

      setNavigating(true);
      setShowOverlay(true);
      setExiting(false);
      setProgress(20);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) { clearInterval(timerRef.current); return 90; }
          return p + Math.random() * 15;
        });
      }, 200);
    }

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pathname]);

  return (
    <NavCtx.Provider value={navigating}>
      {/* Progress bar */}
      {progress > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]">
          <div
            className="h-full bg-[#006728] shadow-[0_0_8px_rgba(0,103,40,0.5)] transition-all duration-200 ease-out"
            style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
          />
        </div>
      )}

      {/* Loading overlay */}
      {showOverlay && (
        <div className={`fixed inset-0 z-[9998] transition-opacity duration-400 ${exiting ? "opacity-0" : "opacity-100"}`} style={{ background: "#7cb668 url('/images/home-bg.jpg') center / cover fixed", backgroundBlendMode: "soft-light" }}>
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className={`flex flex-col items-center justify-center gap-0 ${exiting ? "opacity-0 transition-opacity duration-300" : "animate-fade-in"}`}>
            <div className="loading-bounce">
              <img src="/icons/loading-ball-white.svg" alt="" className="h-10 w-10" />
            </div>
            <div className="loading-shadow" />
            <div className="flex">
              {LOADING_TEXT.split("").map((char, i) => (
                <span
                  key={i}
                  className="loading-wave text-base font-bold text-white"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        </div>
        </div>
      )}

      {children}
    </NavCtx.Provider>
  );
}
