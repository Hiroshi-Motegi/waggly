"use client";

import useSWR, { mutate } from "swr";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import { isNative } from "@/lib/platform";
import type { PracticeSessionWithClubs } from "@/types/database";
import type { InlineClubMemoValue } from "@/components/club/inline-club-memo";

async function fetcher(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function localFetcher() {
  const { getLocalPracticeSessions } = await import("@/lib/local-data");
  return getLocalPracticeSessions();
}

export function usePracticeSessions() {
  const { user } = useAuth();
  const localMode = isNative() && !user;
  const key = localMode ? "local:/practice" : user ? "/api/practice" : null;

  const { data, isLoading, mutate: refetch } = useSWR<PracticeSessionWithClubs[]>(
    key,
    localMode ? localFetcher : fetcher
  );

  return { sessions: data ?? [], isLoading, refetch };
}

interface CreateSessionData {
  practiced_at: string;
  location: string;
  total_balls: number;
  memo: string;
  clubs: { club_id: string; balls: number; avg_distance?: number | null; memo?: InlineClubMemoValue | null }[];
}

export async function createPracticeSession(data: CreateSessionData) {
  if (isNative()) {
    try {
      const res = await apiFetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        mutate((key) => typeof key === "string" && (key.startsWith("/api/practice") || key.startsWith("local:/practice")));
        return res.json();
      }
    } catch {}
    const { saveLocalPracticeSession } = await import("@/lib/local-data");
    const result = await saveLocalPracticeSession(data);
    mutate((key) => typeof key === "string" && (key.startsWith("/api/practice") || key.startsWith("local:/practice")));
    return result;
  }

  const res = await apiFetch("/api/practice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create practice session");
  mutate((key) => typeof key === "string" && key.startsWith("/api/practice"));
  return res.json();
}

export async function updatePracticeSession(sessionId: string, data: any) {
  const res = await apiFetch(`/api/practice/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update practice session");
  mutate((key) => typeof key === "string" && (key.startsWith("/api/practice") || key.startsWith("local:/practice")));
  return res.json();
}

export async function deletePracticeSession(sessionId: string) {
  if (isNative()) {
    try {
      const res = await apiFetch(`/api/practice/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        mutate((key) => typeof key === "string" && (key.startsWith("/api/practice") || key.startsWith("local:/practice")));
        return;
      }
    } catch {}
    const { deleteLocalPracticeSession } = await import("@/lib/local-data");
    await deleteLocalPracticeSession(sessionId);
    mutate((key) => typeof key === "string" && (key.startsWith("/api/practice") || key.startsWith("local:/practice")));
    return;
  }

  const res = await apiFetch(`/api/practice/${sessionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete practice session");
  mutate((key) => typeof key === "string" && key.startsWith("/api/practice"));
}
