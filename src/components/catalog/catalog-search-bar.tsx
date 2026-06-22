"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CatalogSearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length >= 2) {
      router.push(`/catalog/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center gap-2 w-full rounded-md bg-white px-4 py-2.5">
        <svg className="w-4 h-4 text-[#aaa] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="メーカー名・モデル名で検索"
          className="flex-1 text-sm text-[#222] placeholder-[#aaa] bg-transparent outline-none"
          autoComplete="off"
        />
      </div>
    </form>
  );
}
