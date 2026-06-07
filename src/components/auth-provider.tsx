"use client";

import { useEffect, useState } from "react";
import { AuthContext } from "@/hooks/use-auth";
import { initLiff, getLiffProfile } from "@/lib/liff";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function authenticate() {
      try {
        await initLiff();
        const { profile } = await getLiffProfile();

        const res = await fetch("/api/auth/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineUserId: profile.userId,
            displayName: profile.displayName,
            avatarUrl: profile.pictureUrl,
          }),
        });

        if (!res.ok) throw new Error("Auth failed");

        const { userId } = await res.json();

        const supabase = createClient();
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();

        setUser(data);
      } catch (error) {
        console.error("Authentication error:", error);
      } finally {
        setIsLoading(false);
      }
    }

    authenticate();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
