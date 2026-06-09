import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

interface NativeSignInResult {
  user: User | null;
  error: string | null;
}

/**
 * Sign in with Google on native platform.
 * Uses @codetrix-studio/capacitor-google-auth → Supabase signInWithIdToken.
 */
export async function signInWithGoogle(): Promise<NativeSignInResult> {
  try {
    const { GoogleAuth } = await import(
      "@codetrix-studio/capacitor-google-auth"
    );

    const result = await GoogleAuth.signIn();
    const idToken = result.authentication.idToken;

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) return { user: null, error: error.message };

    // Load user profile
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (!profile) {
      // First login: create user profile
      const { data: newProfile } = await supabase
        .from("users")
        .insert({
          id: data.user.id,
          line_user_id: `google-${data.user.id}`,
          display_name:
            data.user.user_metadata?.full_name ??
            data.user.email ??
            "ゲスト",
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
        })
        .select()
        .single();
      return { user: newProfile, error: null };
    }

    return { user: profile, error: null };
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

    // Load user profile
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (!profile) {
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
      return { user: newProfile, error: null };
    }

    return { user: profile, error: null };
  } catch (e: any) {
    return { user: null, error: e.message ?? "Apple sign-in failed" };
  }
}
