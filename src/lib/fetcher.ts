import { apiFetch } from "@/lib/api-client";

/** Shared SWR fetcher for all hooks */
export async function fetcher(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
