"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface ScrollableTableProps {
  children: ReactNode;
  className?: string;
}

export function ScrollableTable({ children, className }: ScrollableTableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={`relative ${className ?? ""}`}>
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 z-20 bg-gradient-to-r from-black/30 to-transparent" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-3 z-20 bg-gradient-to-l from-black/30 to-transparent" />
      )}
      <div ref={ref} className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
