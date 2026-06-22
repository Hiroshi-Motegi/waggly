import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import {
  getSupabaseAdmin,
  verifyGoogleIdToken,
  verifyLineAccessToken,
  exchangeLineCode,
  deleteUserData,
} from "@/lib/auth-helpers";
import { getUserDataSummary } from "@/lib/user-data-summary";
import { withErrorHandler } from "@/lib/api-error";

/**
 * POST /api/auth/link-provider
 *
 * プロバイダ連携。idToken/accessToken/code をサーバー側で検証して
 * provider_sub を取得し、user_providers に行追加。
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const body = await request.json();
  const { provider, idToken, accessToken, code, redirectUri, providerSub: bodyProviderSub, confirmMerge, keepAccountId } = body;

  if (!provider) {
    return NextResponse.json({ error: "Missing provider" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Step 1: プロバイダトークンを検証して provider_sub を取得
  let providerSub: string | null = null;
  let providerEmail: string | null = null;

  if (provider === "google") {
    if (idToken) {
      const result = await verifyGoogleIdToken(idToken);
      if (!result) return NextResponse.json({ error: "Invalid Google ID token" }, { status: 401 });
      providerSub = result.sub;
      providerEmail = result.email ?? null;
    } else if (confirmMerge && bodyProviderSub) {
      // confirmMerge時: OAuthフローは使い捨てのため再利用不可。初回検証済みのproviderSubをそのまま使用。
      providerSub = bodyProviderSub;
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
    } else if (confirmMerge && bodyProviderSub) {
      // confirmMerge時: codeは使い捨てのため再利用不可。初回検証済みのproviderSubをそのまま使用。
      providerSub = bodyProviderSub;
    } else {
      return NextResponse.json({ error: "Missing accessToken or code for LINE" }, { status: 400 });
    }
  } else if (provider === "facebook") {
    if (confirmMerge && bodyProviderSub) {
      // confirmMerge時: コールバックで検証済みのproviderSubをそのまま使用。
      providerSub = bodyProviderSub;
    } else {
      return NextResponse.json({ error: "Missing providerSub for Facebook" }, { status: 400 });
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
    // セッション（auth.users）は触らない。データだけ操作。
    const deleteId = keepAccountId === userId ? existingProvider.user_id : userId;
    const keepId = keepAccountId === userId ? userId : existingProvider.user_id;

    // 現在のセッションの auth_user_id を取得（削除前に）
    const { data: currentProvider } = await supabaseAdmin
      .from("user_providers")
      .select("auth_user_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const currentAuthUserId = currentProvider?.auth_user_id ?? null;

    // 敗者のプロバイダを勝者に移動（重複は敗者側を削除）
    const { data: loserProviders } = await supabaseAdmin
      .from("user_providers")
      .select("*")
      .eq("user_id", deleteId);

    for (const lp of loserProviders ?? []) {
      const { data: dup } = await supabaseAdmin
        .from("user_providers")
        .select("id")
        .eq("user_id", keepId)
        .eq("provider", lp.provider)
        .maybeSingle();

      if (dup) {
        // 勝者が同じプロバイダを持っている → 敗者側を削除
        await supabaseAdmin.from("user_providers").delete().eq("id", lp.id);
      } else {
        // 勝者にない → 移動
        await supabaseAdmin
          .from("user_providers")
          .update({ user_id: keepId })
          .eq("id", lp.id);
      }
    }

    // 現在のセッションの auth_user_id が勝者側に紐づいているか確認
    const { data: sessionProvider } = await supabaseAdmin
      .from("user_providers")
      .select("id")
      .eq("auth_user_id", currentAuthUserId)
      .eq("user_id", keepId)
      .maybeSingle();

    if (!sessionProvider) {
      // セッションが勝者に紐づいていない → 既存行の auth_user_id を更新
      await supabaseAdmin
        .from("user_providers")
        .update({ auth_user_id: currentAuthUserId })
        .eq("user_id", keepId)
        .eq("provider", provider)
        .eq("provider_sub", providerSub);
    }

    // 敗者のデータ + users を削除（user_providers は移動済み、auth.users はそのまま）
    await deleteUserData(supabaseAdmin, deleteId);
    await supabaseAdmin.from("user_providers").delete().eq("user_id", deleteId);
    await supabaseAdmin.from("users").delete().eq("id", deleteId);

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

  return NextResponse.json({ linked: true });
});

/**
 * DELETE /api/auth/link-provider
 *
 * プロバイダ連携解除。
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
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

  const targetProvider = providers.find((p: { provider: string }) => p.provider === provider);
  if (!targetProvider) {
    return NextResponse.json({ error: "Provider not linked" }, { status: 404 });
  }

  // 現在のセッションの auth_user_id を取得
  let currentAuthUserId: string | null = null;
  const { headers: h } = await import("next/headers");
  const headersList = await h();
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: { user: au } } = await supabaseAdmin.auth.getUser(token);
    currentAuthUserId = au?.id ?? null;
  } else {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user: au } } = await supabase.auth.getUser();
    currentAuthUserId = au?.id ?? null;
  }

  // 現在のセッションのプロバイダは解除不可
  if (targetProvider.auth_user_id === currentAuthUserId) {
    return NextResponse.json({
      error: `現在${provider === "google" ? "Google" : "LINE"}でログイン中のため解除できません。別のアカウントでログインしてから解除してください。`,
    }, { status: 400 });
  }

  // user_providers から行削除
  await supabaseAdmin
    .from("user_providers")
    .delete()
    .eq("id", targetProvider.id);

  return NextResponse.json({ unlinked: true, needsRelogin: false });
});
