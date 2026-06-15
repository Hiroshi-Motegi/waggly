"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";

interface UsageData {
  chat: { used: number; limit: number; remaining: number };
  plan: { used: number; limit: number; remaining: number };
  limitReached: boolean;
}

async function fetcher(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useUsage() {
  const { data, error, mutate } = useSWR<UsageData>("/api/usage", fetcher, {
    revalidateOnFocus: true,
  });
  return { usage: data, error, mutate };
}
