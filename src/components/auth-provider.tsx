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

        // Development mode: check for real session first, then fall back to dev user
        if (
          process.env.NODE_ENV === "development" &&
          process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true"
        ) {
          // Check if there's a real Supabase session (from Google/LINE OAuth)
          const { data: { user: realAuth } } = await supabase.auth.getUser();
          if (!realAuth) {
            // No real session: use dev user or show landing
            if (localStorage.getItem("dev-logged-in") !== "false") {
              setUser({
                id: "dev-user",
                line_user_id: "dev-line-id",
                google_id: null,
                google_email: null,
                display_name: "開発ユーザー",
                avatar_url: null,
                agreed_terms_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              });
            }
            setIsLoading(false);
            return;
          }
          // Real session found — fall through to normal auth flow
        }

        // Check for existing Supabase session (common to both web & native)
        const {
          data: { user: existingAuth },
        } = await supabase.auth.getUser();

        if (existingAuth) {
          // Skip heavy auth logic during linking/merge flows — those pages
          // handle auth themselves and auth-provider must not interfere
          const isLinkingFlow = typeof window !== "undefined" && (
            window.location.pathname.startsWith("/auth/link") ||
            window.location.pathname.startsWith("/auth/merge") ||
            window.location.pathname.startsWith("/auth/resolve-conflict") ||
            window.location.pathname.startsWith("/auth/line/callback")
          );

          if (isLinkingFlow) {
            setIsLoading(false);
            return;
          }

          let { data } = await supabase
            .from("users")
            .select("*")
            .eq("id", existingAuth.id)
            .single();

          // For Google logins, check if this auth user should resolve to a
          // different (linked) account, or if Google was unlinked.
          console.log("[auth] provider:", existingAuth.app_metadata?.provider, "hasData:", !!data, "userId:", existingAuth.id?.substring(0, 8));
          if (existingAuth.app_metadata?.provider === "google") {
            const googleSub = existingAuth.user_metadata?.sub;

            // If profile exists but google_id is null, Google was unlinked.
            // Treat as orphan — the resolve-google-user API will handle
            // cleanup or this will fall through to new user creation.
            if (data && !data.google_id) {
              console.log("[auth] Google was unlinked, treating as new user");
              data = null; // Force new user creation below
            }

            const isOrphan = !data;
            console.log("[auth] Google resolve check:", { googleSub: googleSub?.substring(0, 10), isOrphan, dataGoogleId: data?.google_id?.substring(0, 10) });
            if (isOrphan) {
              try {
                const { apiFetch } = await import("@/lib/api-client");
                const res = await apiFetch("/api/auth/resolve-google-user", {
                  method: "POST",
                });
                const result = await res.json();
                console.log("[auth] resolve API response:", res.status, result);
                if (res.ok && result.found && result.access_token) {
                  // Switch to the linked user's session
                  await supabase.auth.setSession({
                    access_token: result.access_token,
                    refresh_token: result.refresh_token,
                  });
                  setUser(result.user);
                  setIsLoading(false);
                  return;
                }
              } catch (e) {
                console.error("Failed to resolve linked Google user:", e);
              }
            }
          } else {
            console.log("[auth] Not a Google login, skipping resolve");
          }

          // First OAuth login (Google/LINE OIDC): create user profile
          if (!data && existingAuth.id) {
            const meta = existingAuth.user_metadata ?? {};
            const isGoogle = existingAuth.app_metadata?.provider === "google";
            const googleId = isGoogle ? (meta.sub ?? existingAuth.id) : null;
            const lineUserId = !isGoogle
              ? (meta.provider_id ?? `oauth-${existingAuth.id}`)
              : `oauth-${existingAuth.id}`;
            const { data: newProfile } = await supabase
              .from("users")
              .insert({
                id: existingAuth.id,
                line_user_id: lineUserId,
                google_id: googleId,
                display_name: meta.full_name ?? meta.name ?? meta.display_name ?? existingAuth.email ?? "ゲスト",
                avatar_url: meta.avatar_url ?? meta.picture ?? null,
                agreed_terms_at: new Date().toISOString(),
              })
              .select()
              .single();
            data = newProfile;
          }

          // Auto-set google_id only for newly created profiles (within 10 seconds)
          // Skip for existing profiles to avoid overwriting intentional unlinks
          const isNewProfile = data && !data.google_id &&
            (Date.now() - new Date(data.created_at).getTime() < 10000);
          if (isNewProfile) {
            let googleId: string | null = null;
            if (existingAuth.app_metadata?.provider === "google") {
              googleId = existingAuth.user_metadata?.sub ?? existingAuth.id;
            } else {
              // Check identities array for linked Google identity
              const googleIdentity = existingAuth.identities?.find(
                (i: any) => i.provider === "google"
              );
              if (googleIdentity) {
                googleId = googleIdentity.identity_data?.sub ?? googleIdentity.id;
              }
            }
            if (googleId) {
              await supabase
                .from("users")
                .update({ google_id: googleId })
                .eq("id", data.id);
              data.google_id = googleId;
            }
          }

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

        // Web: LIFF auth flow (only inside LINE app)
        const { initLiff, getLiffProfile } = await import("@/lib/liff");
        const deepLink = await initLiff();

        const { liff } = await import("@/lib/liff");
        const isLiffClient = liff.isInClient();
        if (isLiffClient) {
          document.documentElement.classList.add("liff-client");
        }

        if (existingAuth) {
          if (deepLink) router.replace(deepLink);
          return;
        }

        // Outside LINE app: stop here, show landing page with login buttons
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
