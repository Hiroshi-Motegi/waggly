import { NextRequest, NextResponse } from "next/server";
import { getApiAuthWithAuthUserId } from "@/lib/supabase/api";
import { extractProviderInfo, deleteUserData, uploadAvatarFromUrl } from "@/lib/auth-helpers";
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

  // request body を先に読む
  let hasLocalData = false;
  let localLastUpdated: string | null = null;
  try {
    const body = await request.json();
    hasLocalData = body?.hasLocalData ?? false;
    localLastUpdated = body?.localLastUpdated ?? null;
  } catch {
    // bodyなし = Web or ローカルデータなし
  }

  // Case 1: auth_user_id で既存ユーザーが見つかった
  if (userId) {
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (user) {
      // ローカルデータがある場合は衝突チェック
      if (hasLocalData) {
        const serverSummary = await getUserDataSummary(supabase, userId);
        const serverHasData =
          serverSummary.counts.clubs > 0 ||
          serverSummary.counts.practices > 0 ||
          serverSummary.counts.accessories > 0;

        if (serverHasData) {
          // 最終更新日時が同じならデータは同一 → 衝突スキップ
          if (localLastUpdated && serverSummary.lastUpdated &&
              localLastUpdated === serverSummary.lastUpdated) {
            return NextResponse.json({ user, conflict: false });
          }

          // 両方にデータがあり日時が異なる → 衝突
          return NextResponse.json({
            conflict: true,
            existingUser: {
              userId,
              lastUpdated: serverSummary.lastUpdated,
              counts: serverSummary.counts,
            },
            provider: "returning",
            providerSub: null,
            authUserId,
          });
        }
        // サーバーにデータがない → ローカルデータをアップロードすればいいだけ（衝突ではない）
        return NextResponse.json({ user, conflict: false, isNew: false, uploadLocal: true });
      }
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

  // まず仮の avatar_url でユーザー作成（user_id が必要なため）
  const { data: newUser, error: userError } = await supabase
    .from("users")
    .insert({
      display_name: displayName,
      avatar_url: null,
      google_email: googleEmail,
    })
    .select("*")
    .single();

  // アバターを Storage に保存して URL を更新
  if (newUser && avatarUrl) {
    const storedUrl = await uploadAvatarFromUrl(supabase, newUser.id, avatarUrl);
    await supabase.from("users").update({ avatar_url: storedUrl }).eq("id", newUser.id);
    newUser.avatar_url = storedUrl;
  }

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

  return NextResponse.json({ user: newUser, conflict: false, isNew: true, provider: providerInfo.provider });
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

  if (!choice || !existingUserId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // existingUserId が呼び出し元セッションに紐づくことを検証
  // （auth_user_id 経由 or provider+providerSub 経由）
  let ownershipCheck = null;

  // 1. auth_user_id で紐づくか
  const { data: byAuth } = await supabase
    .from("user_providers")
    .select("user_id")
    .eq("user_id", existingUserId)
    .eq("auth_user_id", authUserId)
    .limit(1)
    .maybeSingle();

  ownershipCheck = byAuth;

  // 2. provider+providerSub でも紐づくか（auth_user_id で見つからなかった場合）
  if (!ownershipCheck && provider && providerSub) {
    const { data: byProvider } = await supabase
      .from("user_providers")
      .select("user_id")
      .eq("user_id", existingUserId)
      .eq("provider", provider)
      .eq("provider_sub", providerSub)
      .limit(1)
      .maybeSingle();

    ownershipCheck = byProvider;
  }

  if (!ownershipCheck) {
    return NextResponse.json({ error: "Forbidden: no claim to this user" }, { status: 403 });
  }

  if (choice === "local" && localData) {
    await deleteUserData(supabase, existingUserId);
    await insertLocalData(supabase, existingUserId, localData);
  }

  // provider + providerSub がある場合のみ user_providers を更新
  // (Case 2 の初回サインイン衝突解決時のみ。Case 1 の再ログイン衝突では不要)
  if (provider && providerSub) {
    await supabase
      .from("user_providers")
      .update({ auth_user_id: authUserId })
      .eq("provider", provider)
      .eq("provider_sub", providerSub);
  }

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", existingUserId)
    .single();

  return NextResponse.json({ user, conflict: false });
}
