"use client";

import useSWR, { mutate } from "swr";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import { fetcher } from "@/lib/fetcher";
import { isNative } from "@/lib/platform";
import type { Club, ClubWithImages, ClubStatus, Maintenance } from "@/types/database";

export function useClubs(status?: ClubStatus, bagNumber?: number) {
  const { user } = useAuth();
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (bagNumber != null) params.set("bag_number", String(bagNumber));
  const qs = params.toString();

  // apiFetch handles local mode internally — always provide a key
  const key = (user || isNative()) ? `/api/clubs${qs ? `?${qs}` : ""}` : null;

  const { data, isLoading, mutate: refetch } = useSWR<ClubWithImages[]>(key, fetcher);

  return { clubs: data ?? [], isLoading, refetch };
}

export function useClub(clubId: string) {
  const { user } = useAuth();
  const key = (user || isNative()) ? `/api/clubs/${clubId}` : null;

  const { data, isLoading } = useSWR<ClubWithImages & { maintenances: Maintenance[] }>(key, fetcher);

  return { club: data ?? null, isLoading };
}

export async function createClub(data: Partial<Club>): Promise<Club> {
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
  const res = await apiFetch(`/api/clubs/${clubId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete club");
  mutate((key) => typeof key === "string" && key.startsWith("/api/clubs"));
}
