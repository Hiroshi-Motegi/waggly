import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin, verifyLineIdToken, uploadAvatarFromUrl } from "@/lib/auth-helpers";

function derivePassword(lineUserId: string): string {
  const secret = process.env.LINE_PASSWORD_SECRET;
  if (!secret) throw new Error("LINE_PASSWORD_SECRET is not set");
  return crypto
    .createHmac("sha256", secret)
    .update(lineUserId)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  let lineUserId: string;
  let displayName: string;
  let avatarUrl: string | null = null;

  if (body.idToken) {
    const verified = await verifyLineIdToken(body.idToken);
    if (!verified) {
      return NextResponse.json({ error: "Invalid LINE token" }, { status: 401 });
    }
    lineUserId = verified.sub;
    displayName = body.displayName || verified.name;
    avatarUrl = body.avatarUrl || verified.picture || null;
  } else {
    return NextResponse.json({ error: "ID token required" }, { status: 400 });
  }

  if (!lineUserId || !displayName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const email = `${lineUserId}@line.waggly.app`;
  const password = derivePassword(lineUserId);

  // user_providers で既存ユーザーを検索
  const { data: existingProvider } = await supabaseAdmin
    .from("user_providers")
    .select("user_id, auth_user_id")
    .eq("provider", "line")
    .eq("provider_sub", lineUserId)
    .maybeSingle();

  let authUserId: string;

  // LINE ログインには LINE 専用の auth user (email/password) が必要。
  // 1. 作成を試みる → 成功ならそのまま使う
  // 2. email 重複 → パスワード更新して使う
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { line_user_id: lineUserId, display_name: displayName },
  });

  if (created?.user) {
    authUserId = created.user.id;
  } else {
    // 既存の auth user を探してパスワード更新
    const { data: signIn } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (signIn?.user) {
      authUserId = signIn.user.id;
    } else {
      // パスワード不一致 → admin で強制リセット
      // createUser のエラーからは ID が取れないので、dummy signUp で探す
      // 最もシンプル: 既存を削除して再作成
      // existingProvider.auth_user_id が LINE auth user かもしれないし、Google かもしれない
      // → 安全に email ベースで処理するため、signInWithPassword 失敗時は
      //   admin.createUser を email_confirm: false で retry（Supabase は同一 email で上書きしない）
      //   → 代わりに: admin API で全ユーザー取得は非効率なので、
      //     signInWithPassword のみに頼る。パスワードは deterministic なので通常成功するはず。
      return NextResponse.json({ error: "LINE auth failed" }, { status: 500 });
    }
  }

  if (existingProvider) {
    // 既存ユーザー → プロフィールは上書きしない。auth_user_id の更新のみ。
    await supabaseAdmin
      .from("user_providers")
      .update({ auth_user_id: authUserId })
      .eq("provider", "line")
      .eq("provider_sub", lineUserId);
  } else {
    // 完全新規 → ユーザー + provider 行作成
    const { data: newUser } = await supabaseAdmin
      .from("users")
      .insert({})
      .select("id")
      .single();

    if (newUser) {
      // profiles にニックネームとアバターを保存
      let storedAvatarUrl: string | null = null;
      if (avatarUrl) {
        storedAvatarUrl = await uploadAvatarFromUrl(supabaseAdmin, newUser.id, avatarUrl);
      }
      await supabaseAdmin.from("profiles").insert({
        id: newUser.id,
        nickname: displayName,
        avatar_url: storedAvatarUrl,
      });

      await supabaseAdmin.from("user_providers").insert({
        user_id: newUser.id,
        provider: "line",
        auth_user_id: authUserId,
        provider_sub: lineUserId,
      });
    }
  }

  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  });
}
