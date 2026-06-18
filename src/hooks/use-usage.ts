"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface UsageData {
  chat: { used: number; limit: number; remaining: number };
  plan: { used: number; limit: number; remaining: number };
  limitReached: boolean;
}

export function useUsage() {
  const { data, error, mutate } = useSWR<UsageData>("/api/usage", fetcher, {
    revalidateOnFocus: true,
  });
  return { usage: data, error, mutate };
}
