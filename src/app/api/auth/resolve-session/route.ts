import { NextRequest, NextResponse } from "next/server";
import { getApiAuthWithAuthUserId } from "@/lib/supabase/api";
import { extractProviderInfo, deleteUserData } from "@/lib/auth-helpers";
import { getUserDataSummary } from "@/lib/user-data-summary";
import { insertLocalData } from "@/lib/insert-local-data";

/**
 * POST /api/auth/resolve-session
 *
 * ログイン後のユーザー解決。クライアントはbodyを送らない（またはhasLocalDataのみ）。
 * サーバーが JWT から auth_user_id を取得して処理する。
 *
 * 1. user_providers.auth_user_id で検索 → 見つかればユーザー返却
 * 2. provider_sub で検索 → 別ユーザーが見つかれば衝突検出
 * 3. 誰も見つからない → 新規ユーザー作成
 */
export async function POST(request: NextRequest) {
  const auth = await getApiAuthWithAuthUserId();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, authUserId, userId } = auth;

  // Case 1: auth_user_id で既存ユーザーが見つかった
  if (userId) {
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (user) {
      return NextResponse.json({ user, conflict: false });
    }
  }

  // auth_user_id で見つからない → メタデータからプロバイダ情報を取得
  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(authUserId);
  if (!authUser) {
    return NextResponse.json({ error: "Auth user not found" }, { status: 500 });
  }

  const providerInfo = extractProviderInfo(authUser);
  if (!providerInfo) {
    return NextResponse.json({ error: "Cannot determine provider" }, { status: 400 });
  }

  // Case 2: provider_sub で既存ユーザーを検索
  const { data: existingProvider } = await supabase
    .from("user_providers")
    .select("user_id")
    .eq("provider", providerInfo.provider)
    .eq("provider_sub", providerInfo.providerSub)
    .maybeSingle();

  if (existingProvider) {
    // request body に hasLocalData があれば衝突判定
    let hasLocalData = false;
    try {
      const body = await request.json();
      hasLocalData = body?.hasLocalData ?? false;
    } catch {
      // bodyなし = Web or ローカルデータなし
    }

    if (hasLocalData) {
      // パターンB: ローカルデータとの衝突
      const existingSummary = await getUserDataSummary(supabase, existingProvider.user_id);
      return NextResponse.json({
        conflict: true,
        existingUser: {
          userId: existingProvider.user_id,
          lastUpdated: existingSummary.lastUpdated,
          counts: existingSummary.counts,
        },
        provider: providerInfo.provider,
        providerSub: providerInfo.providerSub,
        authUserId,
      });
    }

    // パターンA: 単純紐づけ — auth_user_id を更新
    await supabase
      .from("user_providers")
      .update({ auth_user_id: authUserId })
      .eq("provider", providerInfo.provider)
      .eq("provider_sub", providerInfo.providerSub);

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", existingProvider.user_id)
      .single();

    return NextResponse.json({ user, conflict: false });
  }

  // Case 3: 誰も見つからない → 新規ユーザー作成
  const displayName =
    authUser.user_metadata?.full_name ??
    authUser.user_metadata?.name ??
    authUser.user_metadata?.display_name ??
    authUser.email ??
    "ゲスト";

  const avatarUrl =
    authUser.user_metadata?.avatar_url ??
    authUser.user_metadata?.picture ??
    null;

  const googleEmail =
    providerInfo.provider === "google" ? (providerInfo.providerEmail ?? null) : null;

  const { data: newUser, error: userError } = await supabase
    .from("users")
    .insert({
      display_name: displayName,
      avatar_url: avatarUrl,
      google_email: googleEmail,
      agreed_terms_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (userError || !newUser) {
    console.error("[resolve-session] Failed to create user:", userError);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  await supabase.from("user_providers").insert({
    user_id: newUser.id,
    provider: providerInfo.provider,
    auth_user_id: authUserId,
    provider_sub: providerInfo.providerSub,
    provider_email: providerInfo.providerEmail,
  });

  return NextResponse.json({ user: newUser, conflict: false, isNew: true });
}

/**
 * PUT /api/auth/resolve-session
 *
 * resolve-session で検出された衝突を解決する。
 * choice: "local" → 既存ユーザーのデータ削除 + ローカルデータアップロード
 * choice: "server" → ローカル破棄、既存ユーザーにそのまま紐づけ
 */
export async function PUT(request: NextRequest) {
  const auth = await getApiAuthWithAuthUserId();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, authUserId } = auth;
  const body = await request.json();
  const { choice, existingUserId, provider, providerSub, localData } = body;

  if (!choice || !existingUserId || !provider || !providerSub) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (choice === "local" && localData) {
    await deleteUserData(supabase, existingUserId);
    await insertLocalData(supabase, existingUserId, localData);
  }

  // auth_user_id を既存ユーザーの user_providers に紐づけ
  await supabase
    .from("user_providers")
    .update({ auth_user_id: authUserId })
    .eq("provider", provider)
    .eq("provider_sub", providerSub);

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", existingUserId)
    .single();

  return NextResponse.json({ user, conflict: false });
}
