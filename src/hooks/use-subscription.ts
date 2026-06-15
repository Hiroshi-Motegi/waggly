"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";
import type { Plan, Subscription } from "@/lib/plans";

interface SubscriptionData {
  subscription: Subscription | null;
  plan: Plan;
}

async function fetcher(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useSubscription() {
  const { data, error, mutate } = useSWR<SubscriptionData>(
    "/api/subscription",
    fetcher,
    { revalidateOnFocus: true }
  );
  return {
    subscription: data?.subscription,
    plan: data?.plan,
    error,
    mutate,
  };
}
