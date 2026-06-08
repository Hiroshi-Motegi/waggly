"use client";

import { useRef, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const ANIMATED_PREFIXES = ["/bag", "/items", "/practice", "/courses"];

function shouldSlide(prev: string, next: string): boolean {
  if (prev === next) return false;
  return ANIMATED_PREFIXES.some(
    (prefix) => prev.startsWith(prefix) && next.startsWith(prefix)
  );
}

function getDirection(prev: string, next: string): "forward" | "back" {
  const prevDepth = prev.split("/").filter(Boolean).length;
  const nextDepth = next.split("/").filter(Boolean).length;
  return nextDepth > prevDepth ? "forward" : "back";
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [animClass, setAnimClass] = useState("opacity-0");

  useEffect(() => {
    const prev = prevPathname.current;
    prevPathname.current = pathname;

    if (shouldSlide(prev, pathname)) {
      const dir = getDirection(prev, pathname);
      setAnimClass(dir === "forward" ? "translate-x-[20%] opacity-0" : "-translate-x-[20%] opacity-0");
      requestAnimationFrame(() => {
        setAnimClass("translate-x-0 opacity-100 transition-all duration-250 ease-out");
      });
      return;
    }

    // Fade in for all other navigations (including initial load)
    setAnimClass("opacity-0");
    requestAnimationFrame(() => {
      setAnimClass("opacity-100 transition-opacity duration-300 ease-out");
    });
  }, [pathname]);

  return (
    <div className={animClass}>
      {children}
    </div>
  );
}
