"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { isNative } from "@/lib/platform";
import type { User } from "@/types/database";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function authenticate() {
      try {
        // Development mode: check localStorage flag
        if (
          process.env.NODE_ENV === "development" &&
          process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true"
        ) {
          if (localStorage.getItem("dev-logged-in") !== "false") {
            setUser({
              id: "dev-user",
              line_user_id: "dev-line-id",
              display_name: "開発ユーザー",
              avatar_url: null,
              agreed_terms_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            });
          }
          setIsLoading(false);
          return;
        }

        const supabase = createClient();

        // Check for existing Supabase session (common to both web & native)
        const {
          data: { user: existingAuth },
        } = await supabase.auth.getUser();

        if (existingAuth) {
          const { data } = await supabase
            .from("users")
            .select("*")
            .eq("id", existingAuth.id)
            .single();

          if (data) {
            setUser(data);
            setIsLoading(false);
            return;
          }
        }

        if (isNative()) {
          // Native: no session → local mode (SQLite only, no sign-in required)
          setIsLoading(false);
          return;
        }

        // Web: LIFF auth flow
        const { initLiff, getLiffProfile } = await import("@/lib/liff");
        const deepLink = await initLiff();

        const { liff } = await import("@/lib/liff");
        if (liff.isInClient()) {
          document.documentElement.classList.add("liff-client");
        }

        if (existingAuth) {
          if (deepLink) router.replace(deepLink);
          return;
        }

        const { profile, idToken } = await getLiffProfile();

        const { apiFetch } = await import("@/lib/api-client");
        const res = await apiFetch("/api/auth/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            displayName: profile.displayName,
            avatarUrl: profile.pictureUrl,
          }),
        });

        if (!res.ok) throw new Error("Auth failed");

        const { access_token, refresh_token } = await res.json();

        const { error: signInError } =
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

        if (signInError) throw new Error(signInError.message);

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
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
    <AuthContext.Provider value={{ user, isLoading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
