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
          let { data } = await supabase
            .from("users")
            .select("*")
            .eq("id", existingAuth.id)
            .single();

          // Check if this Google account is linked to another user
          if (!data && existingAuth.app_metadata?.provider === "google") {
            const googleId = existingAuth.user_metadata?.sub ?? existingAuth.id;
            const { data: linkedUser } = await supabase
              .from("users")
              .select("*")
              .eq("google_id", googleId)
              .maybeSingle();
            if (linkedUser) {
              data = linkedUser;
            }
          }

          // First OAuth login (Google/LINE OIDC): create user profile
          if (!data && existingAuth.id) {
            const meta = existingAuth.user_metadata ?? {};
            const googleId = existingAuth.app_metadata?.provider === "google"
              ? (meta.sub ?? existingAuth.id) : null;
            const { data: newProfile } = await supabase
              .from("users")
              .insert({
                id: existingAuth.id,
                line_user_id: meta.provider_id ?? `oauth-${existingAuth.id}`,
                google_id: googleId,
                display_name: meta.full_name ?? meta.name ?? meta.display_name ?? existingAuth.email ?? "ゲスト",
                avatar_url: meta.avatar_url ?? meta.picture ?? null,
                agreed_terms_at: new Date().toISOString(),
              })
              .select()
              .single();
            data = newProfile;
          }

          // Auto-set google_id if logged in via Google and not yet set
          if (data && !data.google_id && existingAuth.app_metadata?.provider === "google") {
            const googleId = existingAuth.user_metadata?.sub ?? existingAuth.id;
            await supabase
              .from("users")
              .update({ google_id: googleId })
              .eq("id", data.id);
            data.google_id = googleId;
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
