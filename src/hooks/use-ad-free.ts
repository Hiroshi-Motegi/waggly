"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";
async function fetcher(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) return { ad_free: false };
  return res.json();
}

export function useAdFree() {
  const { data } = useSWR<{ ad_free: boolean }>("/api/account/ad-free", fetcher, {
    revalidateOnFocus: false,
  });

  return { isAdFree: data?.ad_free === true };
}
