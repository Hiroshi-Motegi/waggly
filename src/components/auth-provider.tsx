"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { isNative } from "@/lib/platform";
import { trackEvent } from "@/lib/gtm";

function trackLogin(method: string) {
  if (sessionStorage.getItem("login_tracked")) return;
  sessionStorage.setItem("login_tracked", "1");
  trackEvent("login", { method });
}
import type { User } from "@/types/database";
import { showError } from "@/lib/toast";

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
                agreed_terms_at: new Date().toISOString(),
                onboarding_version: 1,
                is_admin: true,
                ad_free: true,
                created_at: new Date().toISOString(),
              });
            }
            setIsLoading(false);
            return;
          }
        }

        // Check for existing Supabase session
        const { data: { user: existingAuth }, error: authError } = await supabase.auth.getUser();

        // 無効なセッション（削除された auth.users 等）→ クリアして未ログイン扱い
        if (authError && !existingAuth) {
          await supabase.auth.signOut();
          // 以下の LIFF / native フローに進む
        } else if (existingAuth) {
          // resolve-session を呼んでユーザーを解決
          const { apiFetch } = await import("@/lib/api-client");

          // ネイティブの場合、ローカルデータの有無と最終更新日時を確認
          let hasLocalData = false;
          let localLastUpdated: string | null = null;
          if (isNative()) {
            try {
              const { getLocalDataSummary } = await import("@/lib/sync");
              const localSummary = await getLocalDataSummary();
              hasLocalData =
                localSummary.counts.clubs > 0 ||
                localSummary.counts.practices > 0 ||
                localSummary.counts.accessories > 0;
              localLastUpdated = localSummary.lastUpdated;
            } catch (e) {
              console.warn("Failed to get local data summary:", e);
            }
          }

          const res = await apiFetch("/api/auth/resolve-session", {
            method: "POST",
            ...(hasLocalData ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ hasLocalData: true, localLastUpdated }),
            } : {}),
          });

          if (res.ok) {
            const result = await res.json();
            const method = result.provider ?? (isNative() ? "native" : "google");
            if (result.conflict) {
              if (isNative()) {
                localStorage.setItem("conflict_info", JSON.stringify(result));
              }
            } else if (result.uploadLocal && isNative()) {
              // サーバーにデータがない → ローカルデータをアップロード
              try {
                const { collectLocalData, fullSync } = await import("@/lib/sync");
                const localData = await collectLocalData();
                await apiFetch("/api/auth/upload-local-data", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ localData }),
                });
                await fullSync();
              } catch (e) {
                console.error("Failed to upload local data:", e);
              }
              setUser(result.user);
              if (result.isNew) trackEvent("sign_up", { method });
              else trackLogin(method);
            } else if (result.user) {
              setUser(result.user);
              if (result.isNew) trackEvent("sign_up", { method });
              else trackLogin(method);
              // 衝突なし・アップロード不要 → 通常 sync
              if (isNative()) {
                try {
                  const { fullSync } = await import("@/lib/sync");
                  await fullSync();
                } catch (e) {
                  console.warn("Sync failed:", e);
                }
              }
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
            if (result.user) {
              setUser(result.user);
              if (result.isNew) trackEvent("sign_up", { method: "liff" });
              else trackLogin("liff");
            }
          }
          if (deepLink) router.replace(deepLink);
          setIsLoading(false);
          return;
        }

        if (!isLiffClient || !liff.isLoggedIn()) {
          // Not inside LINE app, or LIFF login redirect in progress → stop here
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
          if (result.user) {
            setUser(result.user);
            if (result.isNew) trackEvent("sign_up", { method: "line" });
            else trackLogin("line");
          }
        }

        if (deepLink) router.replace(deepLink);
      } catch (error) {
        console.error("Authentication error:", error);
        showError(error);
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
