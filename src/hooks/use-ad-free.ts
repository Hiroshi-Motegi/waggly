"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_ID } from "@/lib/plans";

async function fetcher(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) return { ad_free: false };
  return res.json();
}

export function useAdFree() {
  const { plan } = useSubscription();
  const { data } = useSWR<{ ad_free: boolean }>("/api/account/ad-free", fetcher, {
    revalidateOnFocus: false,
  });

  const isPro = plan?.id === PLAN_ID.PRO;
  const isAdFree = isPro || data?.ad_free === true;

  return { isAdFree };
}
