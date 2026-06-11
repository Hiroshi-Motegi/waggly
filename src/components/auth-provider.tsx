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
        const supabase = createClient();

        // Development mode: dev user
        if (
          process.env.NODE_ENV === "development" &&
          process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true"
        ) {
          const { data: { user: realAuth } } = await supabase.auth.getUser();
          if (!realAuth) {
            if (localStorage.getItem("dev-logged-in") !== "false") {
              setUser({
                id: "dev-user",
                display_name: "開発ユーザー",
                avatar_url: null,
                google_email: null,
                agreed_terms_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              });
            }
            setIsLoading(false);
            return;
          }
        }

        // Check for existing Supabase session
        const { data: { user: existingAuth } } = await supabase.auth.getUser();

        if (existingAuth) {
          // resolve-session を呼んでユーザーを解決
          const { apiFetch } = await import("@/lib/api-client");
          const res = await apiFetch("/api/auth/resolve-session", {
            method: "POST",
          });

          if (res.ok) {
            const result = await res.json();
            if (result.conflict) {
              // 衝突 → native の場合は設定ページの選択UIへ
              if (isNative()) {
                localStorage.setItem("conflict_info", JSON.stringify(result));
              }
            } else if (result.user) {
              setUser(result.user);
            }
          }

          setIsLoading(false);
          return;
        }

        if (isNative()) {
          // Native: no session → local mode
          setIsLoading(false);
          return;
        }

        // Web: LIFF auth flow
        const { initLiff, getLiffProfile } = await import("@/lib/liff");
        const deepLink = await initLiff();

        const { liff } = await import("@/lib/liff");
        const isLiffClient = liff.isInClient();
        if (isLiffClient) {
          document.documentElement.classList.add("liff-client");
        }

        // Check again after LIFF init
        const { data: { user: postLiffAuth } } = await supabase.auth.getUser();
        if (postLiffAuth) {
          // Already have session — resolve and redirect
          const { apiFetch } = await import("@/lib/api-client");
          const res = await apiFetch("/api/auth/resolve-session", { method: "POST" });
          if (res.ok) {
            const result = await res.json();
            if (result.user) setUser(result.user);
          }
          if (deepLink) router.replace(deepLink);
          setIsLoading(false);
          return;
        }

        if (!isLiffClient) {
          setIsLoading(false);
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

        await supabase.auth.setSession({ access_token, refresh_token });

        // resolve-session でユーザー取得
        const resolveRes = await apiFetch("/api/auth/resolve-session", {
          method: "POST",
        });

        if (resolveRes.ok) {
          const result = await resolveRes.json();
          if (result.user) setUser(result.user);
        }

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
