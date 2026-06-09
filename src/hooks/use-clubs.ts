"use client";

import useSWR, { mutate } from "swr";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import { isNative } from "@/lib/platform";
import type { Club, ClubWithImages, ClubStatus } from "@/types/database";

async function fetcher(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function localClubsFetcher(key: string) {
  const { getLocalClubs } = await import("@/lib/local-data");
  const params = new URLSearchParams(key.split("?")[1] ?? "");
  return getLocalClubs(params.get("status") ?? undefined, params.has("bag_number") ? Number(params.get("bag_number")) : undefined);
}

async function localClubFetcher(key: string) {
  const { getLocalClub } = await import("@/lib/local-data");
  const clubId = key.split("/").pop()!;
  return getLocalClub(clubId);
}

export function useClubs(status?: ClubStatus, bagNumber?: number) {
  const { user } = useAuth();
  const localMode = isNative() && !user;
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (bagNumber != null) params.set("bag_number", String(bagNumber));
  const qs = params.toString();

  const key = localMode
    ? `local:/clubs${qs ? `?${qs}` : ""}`
    : user ? `/api/clubs${qs ? `?${qs}` : ""}` : null;

  const { data, isLoading, mutate: refetch } = useSWR<ClubWithImages[]>(
    key,
    localMode ? localClubsFetcher : fetcher
  );

  return { clubs: data ?? [], isLoading, refetch };
}

export function useClub(clubId: string) {
  const { user } = useAuth();
  const localMode = isNative() && !user;

  const key = localMode
    ? `local:/clubs/${clubId}`
    : user ? `/api/clubs/${clubId}` : null;

  const { data, isLoading } = useSWR<ClubWithImages & { maintenances: any[] }>(
    key,
    localMode ? localClubFetcher : fetcher
  );

  return { club: data ?? null, isLoading };
}

export async function createClub(data: Partial<Club>): Promise<Club> {
  if (isNative()) {
    // Check if signed in
    try {
      const res = await apiFetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        mutate((key) => typeof key === "string" && (key.startsWith("/api/clubs") || key.startsWith("local:/clubs")));
        return res.json();
      }
    } catch {}
    // Fallback to local
    const { saveLocalClub } = await import("@/lib/local-data");
    const result = await saveLocalClub(data);
    mutate((key) => typeof key === "string" && (key.startsWith("/api/clubs") || key.startsWith("local:/clubs")));
    return result;
  }

  const res = await apiFetch("/api/clubs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create club");
  mutate((key) => typeof key === "string" && key.startsWith("/api/clubs"));
  return res.json();
}

export async function updateClub(clubId: string, data: Partial<Club>): Promise<Club> {
  if (isNative()) {
    try {
      const res = await apiFetch(`/api/clubs/${clubId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        mutate((key) => typeof key === "string" && (key.startsWith("/api/clubs") || key.startsWith("local:/clubs")));
        return res.json();
      }
    } catch {}
    const { saveLocalClub } = await import("@/lib/local-data");
    const result = await saveLocalClub({ id: clubId, ...data });
    mutate((key) => typeof key === "string" && (key.startsWith("/api/clubs") || key.startsWith("local:/clubs")));
    return result;
  }

  const res = await apiFetch(`/api/clubs/${clubId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update club");
  mutate((key) => typeof key === "string" && key.startsWith("/api/clubs"));
  return res.json();
}

export async function deleteClub(clubId: string): Promise<void> {
  if (isNative()) {
    try {
      const res = await apiFetch(`/api/clubs/${clubId}`, { method: "DELETE" });
      if (res.ok) {
        mutate((key) => typeof key === "string" && (key.startsWith("/api/clubs") || key.startsWith("local:/clubs")));
        return;
      }
    } catch {}
    const { deleteLocalClub } = await import("@/lib/local-data");
    await deleteLocalClub(clubId);
    mutate((key) => typeof key === "string" && (key.startsWith("/api/clubs") || key.startsWith("local:/clubs")));
    return;
  }

  const res = await apiFetch(`/api/clubs/${clubId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete club");
  mutate((key) => typeof key === "string" && key.startsWith("/api/clubs"));
}
