"use client";

import { useRef, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const ANIMATED_PREFIXES = ["/bag", "/items", "/practice", "/courses"];

function shouldAnimate(prev: string, next: string): boolean {
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
  const [animClass, setAnimClass] = useState("");

  useEffect(() => {
    const prev = prevPathname.current;
    prevPathname.current = pathname;

    if (!shouldAnimate(prev, pathname)) {
      setAnimClass("");
      return;
    }

    const dir = getDirection(prev, pathname);
    // Start from offset position
    setAnimClass(dir === "forward" ? "translate-x-[20%] opacity-0" : "-translate-x-[20%] opacity-0");

    // Next frame: animate to center
    const raf = requestAnimationFrame(() => {
      setAnimClass("translate-x-0 opacity-100 transition-all duration-250 ease-out");
    });

    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return (
    <div className={animClass || undefined}>
      {children}
    </div>
  );
}
