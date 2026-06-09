"use client";

import useSWR, { mutate } from "swr";
import { apiFetch } from "@/lib/api-client";
import type { PracticePlanWithItems } from "@/types/database";

async function fetcher(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function usePlans() {
  const { data, isLoading, mutate: refetch } = useSWR<PracticePlanWithItems[]>("/api/coach/plans", fetcher);

  return { plans: data ?? [], isLoading, refetch };
}

export async function generatePlan(source: "auto" | "chat" = "auto") {
  const res = await apiFetch("/api/coach/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });
  if (!res.ok) throw new Error("Failed to generate plan");
  mutate((key) => typeof key === "string" && key.startsWith("/api/coach/plan"));
  return res.json();
}

export async function updatePlan(planId: string, data: { status?: string; memo?: string; rating?: number | null }) {
  const res = await apiFetch(`/api/coach/plan/${planId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update plan");
  mutate((key) => typeof key === "string" && key.startsWith("/api/coach/plan"));
  return res.json();
}
