import { createClient } from "@/lib/supabase/client";
import { registerPlugin } from "@capacitor/core";
import type { User } from "@/types/database";

interface NativeSignInResult {
  user: User | null;
  error: string | null;
}

interface LineLoginResult {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  accessToken?: string;
  idToken?: string;
}

interface LineLoginPlugin {
  login(options: { channelId: string }): Promise<LineLoginResult>;
}

const LineLogin = registerPlugin<LineLoginPlugin>("LineLogin");

/**
 * Sign in with Google on native platform.
 * Uses @codetrix-studio/capacitor-google-auth → Supabase signInWithIdToken.
 */
export async function signInWithGoogle(): Promise<NativeSignInResult> {
  try {
    const { GoogleAuth } = await import(
      "@codetrix-studio/capacitor-google-auth"
    );

    await GoogleAuth.initialize();
    const result = await GoogleAuth.signIn();
    const idToken = result.authentication.idToken;

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) return { user: null, error: error.message };

    let loadedProfile: User | null = null;

    // Load user profile by auth user ID
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profile) {
      loadedProfile = profile;
    } else {
      // No profile for this auth user — check if linked via google_id
      // Use server API to bypass RLS (client can't query other users' rows)
      const googleSub = data.user.user_metadata?.sub;
      if (googleSub) {
        try {
          const { apiFetch } = await import("@/lib/api-client");
          const res = await apiFetch("/api/auth/resolve-google-user", {
            method: "POST",
          });
          const resolveResult = await res.json();
          if (res.ok && resolveResult.found && resolveResult.user) {
            // Switch session to the linked account
            if (resolveResult.access_token) {
              await supabase.auth.setSession({
                access_token: resolveResult.access_token,
                refresh_token: resolveResult.refresh_token,
              });
            }
            loadedProfile = resolveResult.user;
          }
        } catch (e) {
          console.error("resolve-google-user failed:", e);
        }
      }

      if (!loadedProfile) {
        // Truly new user: create profile (no google_id to avoid UNIQUE conflict)
        const { data: newProfile } = await supabase
          .from("users")
          .insert({
            id: data.user.id,
            line_user_id: `google-${data.user.id}`,
            google_email: data.user.email ?? null,
            display_name:
              data.user.user_metadata?.full_name ??
              data.user.email ??
              "ゲスト",
            avatar_url: data.user.user_metadata?.avatar_url ?? null,
          })
          .select()
          .single();
        loadedProfile = newProfile;
      }
    }

    // Check for WID conflict
    const googleSub = data.user.user_metadata?.sub ?? data.user.id;
    const resolvedUser = await handlePostSignIn("google", googleSub, loadedProfile);
    if (!resolvedUser) {
      return { user: null, error: "__CONFLICT__" };
    }
    return { user: resolvedUser, error: null };
  } catch (e: any) {
    return { user: null, error: e.message ?? "Google sign-in failed" };
  }
}

/**
 * Sign in with Apple on native platform.
 * Uses Capacitor Apple Sign In plugin → Supabase signInWithIdToken.
 */
export async function signInWithApple(): Promise<NativeSignInResult> {
  try {
    const { SignInWithApple } = await import(
      "@capacitor-community/apple-sign-in"
    );

    const result = await SignInWithApple.authorize({
      clientId: "jp.waggly.app",
      redirectURI: "https://waggly.jp/auth/callback",
      scopes: "email name",
    });

    const idToken = result.response.identityToken;

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: idToken,
    });

    if (error) return { user: null, error: error.message };

    let loadedProfile: User | null = null;

    // Load user profile
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profile) {
      loadedProfile = profile;
    } else {
      // First login: create user profile
      const displayName =
        result.response.givenName && result.response.familyName
          ? `${result.response.familyName} ${result.response.givenName}`
          : data.user.email ?? "ゲスト";
      const { data: newProfile } = await supabase
        .from("users")
        .insert({
          id: data.user.id,
          line_user_id: `apple-${data.user.id}`,
          display_name: displayName,
          avatar_url: null,
        })
        .select()
        .single();
      loadedProfile = newProfile;
    }

    // Check for WID conflict
    const appleSub = data.user.user_metadata?.sub ?? data.user.id;
    const resolvedUser = await handlePostSignIn("apple", appleSub, loadedProfile);
    if (!resolvedUser) {
      return { user: null, error: "__CONFLICT__" };
    }
    return { user: resolvedUser, error: null };
  } catch (e: any) {
    return { user: null, error: e.message ?? "Apple sign-in failed" };
  }
}

/**
 * Link LINE account on native platform.
 * Uses custom LineLogin Capacitor plugin → LINE SDK.
 * Returns LINE userId and profile for account linking.
 */
export async function nativeLineLogin(): Promise<{
  userId: string;
  displayName: string;
  pictureUrl?: string;
  error: string | null;
}> {
  try {
    const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    if (!channelId) throw new Error("LINE channel ID not configured");

    const result = await LineLogin.login({ channelId });
    return {
      userId: result.userId,
      displayName: result.displayName,
      pictureUrl: result.pictureUrl,
      error: null,
    };
  } catch (e: any) {
    return { userId: "", displayName: "", error: e.message ?? "LINE login failed" };
  }
}

/**
 * After native sign-in, check for WID conflict and handle accordingly.
 * Returns the resolved user, or null if redirecting to conflict page.
 */
export async function handlePostSignIn(
  provider: "google" | "apple" | "line",
  providerUserId: string,
  authUser: any
): Promise<User | null> {
  const { apiFetch, resetLocalModeCache } = await import("@/lib/api-client");
  const { getLocalDataSummary, collectLocalData, fullSync } = await import("@/lib/sync");

  resetLocalModeCache();

  const localSummary = await getLocalDataSummary();

  const checkRes = await apiFetch("/api/auth/check-conflict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, providerUserId, currentWid: authUser?.id }),
  });

  if (!checkRes.ok) {
    await fullSync();
    return authUser;
  }

  const checkResult = await checkRes.json();

  if (!checkResult.conflict) {
    const hasLocalData =
      localSummary.counts.clubs > 0 ||
      localSummary.counts.practices > 0 ||
      localSummary.counts.accessories > 0;

    if (hasLocalData) {
      const localData = await collectLocalData();
      await apiFetch("/api/auth/upload-local-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localData }),
      });
    }

    await fullSync();
    return authUser;
  }

  // Conflict detected — navigate to resolve-conflict page
  const providerLabel =
    provider === "google" ? "Googleアカウント" :
    provider === "apple" ? "Appleアカウント" : "LINEアカウント";

  sessionStorage.setItem(
    "conflict_info",
    JSON.stringify({
      scenario: "first-signin",
      provider,
      providerUserId,
      sourceA: {
        label: "ローカルのデータ",
        isNew: false,
        wid: null,
        lastUpdated: localSummary.lastUpdated,
        counts: localSummary.counts,
      },
      sourceB: {
        label: `${providerLabel}のデータ`,
        isNew: true,
        wid: checkResult.existingUser.wid,
        lastUpdated: checkResult.existingUser.lastUpdated,
        counts: checkResult.existingUser.counts,
      },
    })
  );

  return null;
}
