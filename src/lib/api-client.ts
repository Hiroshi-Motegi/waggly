import { isNative } from "@/lib/platform";
import { createClient } from "@/lib/supabase/client";

const API_BASE = "https://waggly.jp";

export function apiUrl(path: string): string {
  return isNative() ? `${API_BASE}${path}` : path;
}

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = apiUrl(path);

  if (!isNative()) {
    return fetch(url, init);
  }

  // Native: attach JWT from Supabase session
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(url, { ...init, headers });
}
