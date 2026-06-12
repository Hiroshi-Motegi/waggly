import { createClient } from "@/lib/supabase/client";
import { registerPlugin } from "@capacitor/core";
import type { User } from "@/types/database";

interface NativeSignInResult {
  user: User | null;
  conflict: any | null;
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
 * signInWithIdToken → resolve-session で完結。
 */
export async function signInWithGoogle(): Promise<NativeSignInResult> {
  try {
    const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
    await GoogleAuth.initialize();
    const result = await GoogleAuth.signIn();
    const idToken = result.authentication.idToken;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) return { user: null, conflict: null, error: error.message };

    return await resolveSessionAfterSignIn();
  } catch (e: any) {
    return { user: null, conflict: null, error: e.message ?? "Google sign-in failed" };
  }
}

/**
 * Sign in with Apple on native platform.
 */
export async function signInWithApple(): Promise<NativeSignInResult> {
  try {
    const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
    const result = await SignInWithApple.authorize({
      clientId: "jp.waggly.app",
      redirectURI: "https://waggly.jp/auth/callback",
      scopes: "email name",
    });

    const idToken = result.response.identityToken;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: idToken,
    });

    if (error) return { user: null, conflict: null, error: error.message };

    return await resolveSessionAfterSignIn();
  } catch (e: any) {
    return { user: null, conflict: null, error: e.message ?? "Apple sign-in failed" };
  }
}

/**
 * Sign in with LINE on native platform.
 * LINE SDK → idToken/accessToken → /api/auth/line → セッション作成 → resolve-session。
 */
export async function signInWithLine(): Promise<NativeSignInResult> {
  try {
    const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    if (!channelId) throw new Error("LINE channel ID not configured");

    const result = await LineLogin.login({ channelId });

    // LINE API でセッション作成
    const { apiFetch: directFetch } = await import("@/lib/api-client");
    const lineRes = await fetch(`https://waggly.jp/api/auth/line`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken: result.idToken,
        displayName: result.displayName,
        avatarUrl: result.pictureUrl,
      }),
    });

    if (!lineRes.ok) {
      const err = await lineRes.json().catch(() => ({}));
      return { user: null, conflict: null, error: err.error ?? "LINE auth failed" };
    }

    const { access_token, refresh_token } = await lineRes.json();

    const supabase = createClient();
    await supabase.auth.setSession({ access_token, refresh_token });

    return await resolveSessionAfterSignIn();
  } catch (e: any) {
    if (e.message?.includes("cancel") || e.message?.includes("CANCELLED")) {
      return { user: null, conflict: null, error: null };
    }
    return { user: null, conflict: null, error: e.message ?? "LINE sign-in failed" };
  }
}

/**
 * Native LINE login — アカウント連携用。
 * ログインではなく連携なので resolve-session は呼ばない。
 * accessToken を返し、settings ページが link-provider API に渡す。
 */
export async function nativeLineLogin(): Promise<{
  userId: string;
  displayName: string;
  pictureUrl?: string;
  accessToken?: string;
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
      accessToken: result.accessToken,
      error: null,
    };
  } catch (e: any) {
    return { userId: "", displayName: "", error: e.message ?? "LINE login failed" };
  }
}

/**
 * signIn 後に resolve-session を呼んでユーザーを解決する。
 * 全プロバイダ共通。
 */
async function resolveSessionAfterSignIn(): Promise<NativeSignInResult> {
  const { apiFetch, resetLocalModeCache } = await import("@/lib/api-client");
  const { getLocalDataSummary, collectLocalData, fullSync } = await import("@/lib/sync");

  resetLocalModeCache();

  // ローカルデータの有無を確認
  const localSummary = await getLocalDataSummary();
  const hasLocalData =
    localSummary.counts.clubs > 0 ||
    localSummary.counts.practices > 0 ||
    localSummary.counts.accessories > 0;

  // resolve-session を呼ぶ
  const res = await apiFetch("/api/auth/resolve-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hasLocalData }),
  });

  if (!res.ok) {
    return { user: null, conflict: null, error: "resolve-session failed" };
  }

  const result = await res.json();

  if (result.conflict) {
    return {
      user: null,
      conflict: { ...result, localSummary },
      error: null,
    };
  }

  // 衝突なし → ローカルデータがあればアップロード
  if (hasLocalData && result.isNew) {
    const localData = await collectLocalData();
    await apiFetch("/api/auth/upload-local-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localData }),
    });
  }

  await fullSync();

  return { user: result.user, conflict: null, error: null };
}
