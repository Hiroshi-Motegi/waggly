"use client";

import { useCallback, useEffect, useState } from "react";
import type { PracticePlanWithItems } from "@/types/database";

export function usePlans() {
  const [plans, setPlans] = useState<PracticePlanWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch("/api/coach/plans");
    if (res.ok) {
      setPlans(await res.json());
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, isLoading, refetch: fetchPlans };
}

export async function generatePlan(source: "auto" | "chat" = "auto") {
  const res = await fetch("/api/coach/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });
  if (!res.ok) throw new Error("Failed to generate plan");
  return res.json();
}

export async function updatePlan(planId: string, data: { status?: string; memo?: string; rating?: number | null }) {
  const res = await fetch(`/api/coach/plan/${planId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update plan");
  return res.json();
}
