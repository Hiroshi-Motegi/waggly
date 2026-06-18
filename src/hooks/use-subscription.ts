"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Plan, Subscription } from "@/lib/plans";

interface SubscriptionData {
  subscription: Subscription | null;
  plan: Plan;
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
