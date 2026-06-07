"use client";

import { useCallback, useEffect, useState } from "react";
import type { PracticeSessionWithClubs } from "@/types/database";

export function usePracticeSessions() {
  const [sessions, setSessions] = useState<PracticeSessionWithClubs[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch("/api/practice");
    if (res.ok) {
      setSessions(await res.json());
    }
    setIsLoading(false);
  }, []);

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
