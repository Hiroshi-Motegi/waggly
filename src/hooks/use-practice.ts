"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { PracticeSessionWithClubs } from "@/types/database";

export function usePracticeSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PracticeSessionWithClubs[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const res = await fetch("/api/practice");
    if (res.ok) {
      setSessions(await res.json());
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, isLoading, refetch: fetchSessions };
}

interface CreateSessionData {
  practiced_at: string;
  location: string;
  total_balls: number;
  memo: string;
  clubs: { club_id: string; balls: number }[];
}

export async function createPracticeSession(data: CreateSessionData) {
  const res = await fetch("/api/practice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create practice session");
  return res.json();
}

export async function updatePracticeSession(sessionId: string, data: any) {
  const res = await fetch(`/api/practice/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update practice session");
  return res.json();
}

export async function deletePracticeSession(sessionId: string) {
  const res = await fetch(`/api/practice/${sessionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete practice session");
}
