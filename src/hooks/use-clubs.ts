"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Club, ClubWithImages, ClubStatus } from "@/types/database";

export function useClubs(status?: ClubStatus, bagNumber?: number) {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<ClubWithImages[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClubs = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (bagNumber != null) params.set("bag_number", String(bagNumber));
    const qs = params.toString();
    const res = await fetch(`/api/clubs${qs ? `?${qs}` : ""}`);
    if (res.ok) {
      setClubs(await res.json());
    }
    setIsLoading(false);
  }, [status, bagNumber, user]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  return { clubs, isLoading, refetch: fetchClubs };
}

export function useClub(clubId: string) {
  const { user } = useAuth();
  const [club, setClub] = useState<ClubWithImages & { maintenances: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchClub() {
      if (!user) return;
      const res = await fetch(`/api/clubs/${clubId}`);
      if (res.ok) {
        setClub(await res.json());
      }
      setIsLoading(false);
    }
    fetchClub();
  }, [clubId, user]);

  return { club, isLoading };
}

export async function createClub(data: Partial<Club>): Promise<Club> {
  const res = await fetch("/api/clubs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create club");
  return res.json();
}

export async function updateClub(clubId: string, data: Partial<Club>): Promise<Club> {
  const res = await fetch(`/api/clubs/${clubId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update club");
  return res.json();
}

export async function deleteClub(clubId: string): Promise<void> {
  const res = await fetch(`/api/clubs/${clubId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete club");
}
