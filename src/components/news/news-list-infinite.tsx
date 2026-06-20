"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import type { NewsItem } from "@/lib/catalog-news";

const PAGE_SIZE = 10;

export function NewsListInfinite({ items }: { items: NewsItem[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, items.length));
  }, [items.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-white p-4 text-center">
        <p className="text-sm text-[#8b8b8b]">現在ニュースがありません</p>
      </div>
    );
  }

  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <>
      <div className="rounded-lg bg-white overflow-hidden">
        {visible.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 px-4 py-3 ${i < visible.length - 1 ? "border-b border-[#ececec]" : ""}`}
          >
            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                className="w-16 h-16 rounded-md object-cover shrink-0 bg-[#f0f0f0]"
              />
            )}
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <p className="text-sm font-bold text-[#006728] leading-snug line-clamp-3">{item.title}</p>
              <div className="flex items-center gap-2">
                {item.source && <span className="text-xs text-[#888]">{item.source}</span>}
                {item.date && (
                  <span className="text-xs text-[#aaa]">
                    {new Date(item.date).toLocaleDateString("ja-JP")}
                  </span>
                )}
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 text-[#bbb] rotate-180 shrink-0" />
          </a>
        ))}
      </div>
      {hasMore && <div ref={sentinelRef} className="h-10" />}
    </>
  );
}
