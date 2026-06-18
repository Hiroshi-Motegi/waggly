"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

export function useFavoriteClubs() {
  const [favoriteModelIds, setFavoriteModelIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await apiFetch("/api/catalog/favorites");
      if (!res.ok) return;
      const data = await res.json();
      setFavoriteModelIds(new Set(data.map((f: { model_id: string }) => f.model_id)));
    } catch {} finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function toggle(modelId: string) {
    const isFav = favoriteModelIds.has(modelId);
    // Optimistic update
    setFavoriteModelIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(modelId);
      else next.add(modelId);
      return next;
    });

    try {
      await apiFetch("/api/catalog/favorites", {
        method: isFav ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_id: modelId }),
      });
    } catch {
      // Revert on error
      fetch();
    }
  }

  return { favoriteModelIds, isLoading, toggle, refetch: fetch };
}
