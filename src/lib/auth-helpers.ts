import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * auth.users のメタデータからプロバイダ情報を抽出する。
 * resolve-session と link-provider で使用。
 */
export function extractProviderInfo(authUser: {
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}): { provider: string; providerSub: string; providerEmail: string | null } | null {
  const appMeta = authUser.app_metadata ?? {};
  const userMeta = authUser.user_metadata ?? {};

  // Google
  if (appMeta.provider === "google") {
    const sub = userMeta.sub as string | undefined;
    if (!sub) return null;
    return {
      provider: "google",
      providerSub: sub,
      providerEmail: (userMeta.email as string) ?? null,
    };
  }

  // Apple
  if (appMeta.provider === "apple") {
    const sub = userMeta.sub as string | undefined;
    if (!sub) return null;
    return {
      provider: "apple",
      providerSub: sub,
      providerEmail: null,
    };
  }

  // Facebook
  if (appMeta.provider === "facebook") {
    const sub = (userMeta.sub ?? userMeta.provider_id) as string | undefined;
    if (!sub) return null;
    return {
      provider: "facebook",
      providerSub: sub,
      providerEmail: (userMeta.email as string) ?? null,
    };
  }

  // Twitter / X
  if (appMeta.provider === "twitter") {
    const sub = (userMeta.sub ?? userMeta.provider_id) as string | undefined;
    if (!sub) return null;
    return {
      provider: "twitter",
      providerSub: sub,
      providerEmail: null,
    };
  }

  // LINE (email/password auth with line_user_id in metadata)
  if (userMeta.line_user_id) {
    return {
      provider: "line",
      providerSub: userMeta.line_user_id as string,
      providerEmail: null,
    };
  }

  return null;
}

/**
 * LINE IDトークンをサーバー側で検証する。
 */
export async function verifyLineIdToken(
  idToken: string
): Promise<{ sub: string; name: string; picture?: string } | null> {
  // LIFF チャネルとLINE Login チャネルの両方で検証を試みる
  const channelIds = [
    process.env.NEXT_PUBLIC_LIFF_CHANNEL_ID,
    process.env.NEXT_PUBLIC_LINE_CHANNEL_ID,
  ].filter(Boolean) as string[];

  for (const clientId of channelIds) {
    try {
      const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.sub) continue;
      return { sub: data.sub, name: data.name, picture: data.picture };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * LINE OAuth code をトークンに交換し、ユーザーIDを取得する。
 */
export async function exchangeLineCode(
  code: string,
  redirectUri: string
): Promise<{ sub: string; name?: string } | null> {
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
      client_secret: process.env.LINE_CHANNEL_SECRET!,
    }),
  });
  if (!tokenRes.ok) return null;
  const tokens = await tokenRes.json();

  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: tokens.id_token,
      client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
    }),
  });
  if (!verifyRes.ok) return null;
  const verified = await verifyRes.json();
  if (!verified.sub) return null;
  return { sub: verified.sub, name: verified.name };
}

/**
 * LINE accessToken をサーバー側で検証し、ユーザーIDを取得する。
 */
export async function verifyLineAccessToken(
  accessToken: string
): Promise<{ userId: string; displayName: string; pictureUrl?: string } | null> {
  try {
    const res = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.userId) return null;
    return {
      userId: data.userId,
      displayName: data.displayName,
      pictureUrl: data.pictureUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Google IDトークンをローカルで検証してsubを取得する（jose使用）。
 */
export async function verifyGoogleIdToken(
  idToken: string
): Promise<{ sub: string; email?: string; name?: string; picture?: string } | null> {
  try {
    const { createRemoteJWKSet, jwtVerify } = await import("jose");
    const JWKS = createRemoteJWKSet(
      new URL("https://www.googleapis.com/oauth2/v3/certs")
    );
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    const sub = payload.sub;
    if (!sub) return null;
    return {
      sub,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * プロバイダのアバター URL をダウンロードして Supabase Storage に保存する。
 * 保存先: avatars/{userId}/avatar.{ext}
 * 失敗した場合は元の URL をそのまま返す。
 */
export async function uploadAvatarFromUrl(
  supabase: SupabaseClient,
  userId: string,
  avatarUrl: string
): Promise<string> {
  try {
    const res = await fetch(avatarUrl);
    if (!res.ok) return avatarUrl;

    const blob = await res.blob();
    const contentType = blob.type || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { contentType, upsert: true });

    if (error) {
      console.error("[uploadAvatar] Storage upload failed:", error.message);
      return avatarUrl;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    return publicUrl;
  } catch (e) {
    console.error("[uploadAvatar] Failed:", e);
    return avatarUrl;
  }
}

/**
 * ユーザーのデータを全削除する（user_providers と auth.users は含まない）。
 */
export async function deleteUserData(supabase: SupabaseClient, userId: string) {
  await supabase.from("favorite_courses").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", userId);
  await supabase.from("practice_sessions").delete().eq("user_id", userId);
  await supabase.from("accessories").delete().eq("user_id", userId);
  await supabase.from("clubs").delete().eq("user_id", userId);
}

/**
 * ユーザーに紐づく全auth.usersを削除する。
 */
export async function deleteUserAuthAccounts(supabase: SupabaseClient, userId: string) {
  const { data: providers } = await supabase
    .from("user_providers")
    .select("auth_user_id")
    .eq("user_id", userId);

  for (const p of providers ?? []) {
    if (p.auth_user_id) {
      await supabase.auth.admin.deleteUser(p.auth_user_id);
    }
  }
}

/**
 * ユーザーを完全削除する（データ + user_providers + auth.users + usersレコード）。
 */
export async function deleteUserCompletely(supabase: SupabaseClient, userId: string) {
  await deleteUserData(supabase, userId);
  await deleteUserAuthAccounts(supabase, userId);
  await supabase.from("user_providers").delete().eq("user_id", userId);
  await supabase.from("users").delete().eq("id", userId);
}
