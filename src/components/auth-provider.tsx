"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import { initLiff, getLiffProfile } from "@/lib/liff";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function authenticate() {
      try {
        // Development mode: skip LIFF auth
        if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true") {
          setUser({
            id: "dev-user",
            line_user_id: "dev-line-id",
            display_name: "開発ユーザー",
            avatar_url: null,
            agreed_terms_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
          setIsLoading(false);
          return;
        }

        // Init LIFF first — captures liff.state deep link path
        const deepLink = await initLiff();

        // Mark LIFF client for CSS
        const { liff } = await import("@/lib/liff");
        if (liff.isInClient()) {
          document.documentElement.classList.add("liff-client");
        }

        const supabase = createClient();

        // Check for existing Supabase session
        const { data: { user: existingAuth } } = await supabase.auth.getUser();
        if (existingAuth) {
          const { data } = await supabase
            .from("users")
            .select("*")
            .eq("id", existingAuth.id)
            .single();

          if (data) {
            setUser(data);
            setIsLoading(false);
            if (deepLink) router.replace(deepLink);
            return;
          }
        }

        // No session — do full LIFF auth flow
        const { profile } = await getLiffProfile();

        const res = await apiFetch("/api/auth/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineUserId: profile.userId,
            displayName: profile.displayName,
            avatarUrl: profile.pictureUrl,
          }),
        });

        if (!res.ok) throw new Error("Auth failed");

        const { email, password } = await res.json();

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw new Error(signInError.message);

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error("No auth user");

        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        setUser(data);
        if (deepLink) router.replace(deepLink);
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
