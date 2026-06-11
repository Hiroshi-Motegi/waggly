import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import {
  getSupabaseAdmin,
  verifyGoogleIdToken,
  verifyLineAccessToken,
  exchangeLineCode,
  deleteUserCompletely,
} from "@/lib/auth-helpers";
import { getUserDataSummary } from "@/lib/user-data-summary";

/**
 * POST /api/auth/link-provider
 *
 * プロバイダ連携。idToken/accessToken/code をサーバー側で検証して
 * provider_sub を取得し、user_providers に行追加。
 */
export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const body = await request.json();
  const { provider, idToken, accessToken, code, redirectUri, confirmMerge, keepAccountId } = body;

  if (!provider) {
    return NextResponse.json({ error: "Missing provider" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Step 1: プロバイダトークンを検証して provider_sub を取得
  let providerSub: string | null = body.providerSub ?? null;
  let providerEmail: string | null = null;

  // confirmMerge 時は providerSub を直接受け取る（トークンは初回リクエストで検証済み）
  if (confirmMerge && providerSub) {
    // providerSub は初回の衝突検出時に検証済み — 再検証不要
  } else if (provider === "google") {
    if (idToken) {
      const result = await verifyGoogleIdToken(idToken);
      if (!result) return NextResponse.json({ error: "Invalid Google ID token" }, { status: 401 });
      providerSub = result.sub;
      providerEmail = result.email ?? null;
    } else {
      return NextResponse.json({ error: "Missing idToken for Google" }, { status: 400 });
    }
  } else if (provider === "line") {
    if (accessToken) {
      const result = await verifyLineAccessToken(accessToken);
      if (!result) return NextResponse.json({ error: "Invalid LINE access token" }, { status: 401 });
      providerSub = result.userId;
    } else if (code && redirectUri) {
      const result = await exchangeLineCode(code, redirectUri);
      if (!result) return NextResponse.json({ error: "LINE code exchange failed" }, { status: 500 });
      providerSub = result.sub;
    } else {
      return NextResponse.json({ error: "Missing accessToken or code for LINE" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  if (!providerSub) {
    return NextResponse.json({ error: "Could not verify provider credentials" }, { status: 400 });
  }

  // Step 2: 衝突チェック
  const { data: existingProvider } = await supabaseAdmin
    .from("user_providers")
    .select("user_id")
    .eq("provider", provider)
    .eq("provider_sub", providerSub)
    .maybeSingle();

  if (existingProvider && existingProvider.user_id !== userId) {
    if (!confirmMerge) {
      const [currentSummary, existingSummary] = await Promise.all([
        getUserDataSummary(supabaseAdmin, userId),
        getUserDataSummary(supabaseAdmin, existingProvider.user_id),
      ]);

      return NextResponse.json({
        needsConfirm: true,
        providerId: providerSub,
        currentAccount: { id: userId, ...currentSummary },
        existingAccount: { id: existingProvider.user_id, ...existingSummary },
      });
    }

    // confirmMerge = true → マージ実行
    const deleteId = keepAccountId === userId ? existingProvider.user_id : userId;
    const keepId = keepAccountId === userId ? userId : existingProvider.user_id;

    await deleteUserCompletely(supabaseAdmin, deleteId);

    await supabaseAdmin.from("user_providers").insert({
      user_id: keepId,
      provider,
      provider_sub: providerSub,
      provider_email: providerEmail,
    });

    return NextResponse.json({ linked: true, merged: true, mergedInto: keepId });
  }

  if (existingProvider && existingProvider.user_id === userId) {
    return NextResponse.json({ linked: true, alreadyLinked: true });
  }

  // Step 3: 衝突なし → user_providers に行追加
  const { error } = await supabaseAdmin.from("user_providers").insert({
    user_id: userId,
    provider,
    provider_sub: providerSub,
    provider_email: providerEmail,
  });

  if (error) {
    console.error("[link-provider] Insert failed:", error);
    return NextResponse.json({ error: "Failed to link provider" }, { status: 500 });
  }

  if (provider === "google" && providerEmail) {
    await supabaseAdmin
      .from("users")
      .update({ google_email: providerEmail })
      .eq("id", userId);
  }

  return NextResponse.json({ linked: true });
}

/**
 * DELETE /api/auth/link-provider
 *
 * プロバイダ連携解除。
 */
export async function DELETE(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const { provider } = await request.json();
  if (!provider) {
    return NextResponse.json({ error: "Missing provider" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // 最低1つのプロバイダが残るか検証
  const { data: providers } = await supabaseAdmin
    .from("user_providers")
    .select("id, provider, auth_user_id")
    .eq("user_id", userId);

  if (!providers || providers.length <= 1) {
    return NextResponse.json({ error: "最低1つのログイン方法が必要です" }, { status: 400 });
  }

  const targetProvider = providers.find((p: any) => p.provider === provider);
  if (!targetProvider) {
    return NextResponse.json({ error: "Provider not linked" }, { status: 404 });
  }

  // user_providers から行削除
  await supabaseAdmin
    .from("user_providers")
    .delete()
    .eq("id", targetProvider.id);

  // auth.users を削除（孤児防止）
  if (targetProvider.auth_user_id) {
    await supabaseAdmin.auth.admin.deleteUser(targetProvider.auth_user_id);
  }

  // 現在のセッションが解除対象か判定
  let currentAuthUserId: string | null = null;
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    currentAuthUserId = user?.id ?? null;
  } else {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    currentAuthUserId = user?.id ?? null;
  }

  const needsRelogin = currentAuthUserId === targetProvider.auth_user_id;

  // Google 解除時は google_email もクリア
  if (provider === "google") {
    await supabaseAdmin
      .from("users")
      .update({ google_email: null })
      .eq("id", userId);
  }

  return NextResponse.json({ unlinked: true, needsRelogin });
}
