import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";

interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function useAdminList<T>(
  resource: string,
  params: Record<string, string | number> = {},
) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== "" && v !== undefined) query.set(k, String(v));
  }
  const qs = query.toString();
  const key = `/api/admin/${resource}${qs ? `?${qs}` : ""}`;

  return useSWR<ListResponse<T>>(key, async (url: string) => {
    const res = await apiFetch(url);
    if (!res.ok) throw new Error("Fetch failed");
    return res.json();
  });
}

export function useAdminOne<T>(resource: string, id: string) {
  return useSWR<T>(id ? `/api/admin/${resource}/${id}` : null, async (url: string) => {
    const res = await apiFetch(url);
    if (!res.ok) throw new Error("Fetch failed");
    return res.json();
  });
}
