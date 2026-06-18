"use client";

import useSWR, { mutate } from "swr";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import { fetcher } from "@/lib/fetcher";
import { isNative } from "@/lib/platform";
import type { PracticeSessionWithClubs } from "@/types/database";
import type { InlineClubMemoValue } from "@/components/club/inline-club-memo";

export function usePracticeSessions() {
  const { user } = useAuth();
  const key = (user || isNative()) ? "/api/practice" : null;

  const { data, isLoading, mutate: refetch } = useSWR<PracticeSessionWithClubs[]>(key, fetcher);

  return { sessions: data ?? [], isLoading, refetch };
}

export function usePracticeSessionsByMonth(monthKey: string | null) {
  const { user } = useAuth();
  const key = (user || isNative()) && monthKey
    ? `/api/practice?month=${monthKey}`
    : null;

  const { data, isLoading } = useSWR<PracticeSessionWithClubs[]>(key, fetcher);

  return { sessions: data ?? [], isLoading };
}

export interface CreateSessionData {
  practiced_at: string;
  location: string;
  total_balls: number;
  memo: string;
  rating: number | null;
  plan_id?: string;
  clubs: { club_id: string; balls: number; avg_distance?: number | null; memo?: InlineClubMemoValue | null }[];
}

export async function createPracticeSession(data: CreateSessionData) {
  const res = await apiFetch("/api/practice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create practice session");
  mutate((key) => typeof key === "string" && key.startsWith("/api/practice"));
  return res.json();
}

export async function updatePracticeSession(sessionId: string, data: Partial<CreateSessionData>) {
  const res = await apiFetch(`/api/practice/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update practice session");
  mutate((key) => typeof key === "string" && key.startsWith("/api/practice"));
  return res.json();
}

export async function deletePracticeSession(sessionId: string) {
  const res = await apiFetch(`/api/practice/${sessionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete practice session");
  mutate((key) => typeof key === "string" && key.startsWith("/api/practice"));
}
