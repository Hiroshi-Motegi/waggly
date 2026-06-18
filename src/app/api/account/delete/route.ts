import { NextResponse } from "next/server";
import { getApiAuthWithAuthUserId, getAdminClient, unauthorized } from "@/lib/supabase/api";
import { getPayjpClient } from "@/lib/payjp";
import { deleteUserAuthAccounts } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  const auth = await getApiAuthWithAuthUserId();
  if (!auth || !auth.userId) return unauthorized();
  const { userId, authUserId } = auth;

  const { reason } = await req.json();
  if (!reason?.trim()) {
    return NextResponse.json(
      { error: "解約理由を入力してください。" },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  // 1. 解約理由を保存（users 削除前に）
  await supabase.from("account_deletion_reasons").insert({
    user_id: userId,
    reason: reason.trim(),
    plan_id:
      (
        await supabase
          .from("subscriptions")
          .select("plan_id")
          .eq("user_id", userId)
          .in("status", ["active", "paused"])
          .single()
      ).data?.plan_id ?? "free",
  });

  // 2. Pay.jp サブスクをキャンセル（active/paused があれば）
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("payjp_subscription_id, status")
    .eq("user_id", userId)
    .in("status", ["active", "paused"])
    .single();

  if (sub?.payjp_subscription_id) {
    try {
      if (sub.status === "paused") {
        await getPayjpClient().subscriptions.resume(sub.payjp_subscription_id);
      }
      await getPayjpClient().subscriptions.cancel(sub.payjp_subscription_id);
    } catch (e) {
      console.error("Pay.jp cancel failed:", e);
      // Pay.jp 失敗してもアカウント削除は続行
    }
  }

  // 3. Supabase auth ユーザーを全プロバイダ分削除（user_providers が存在する段階で実行）
  try {
    await deleteUserAuthAccounts(supabase, userId);
  } catch (e) {
    console.error("Auth user delete failed:", e);
    // auth 削除失敗してもアカウント削除は続行
  }

  // 4. users 行を削除（CASCADE で全関連データ + user_providers 削除）
  const { error: deleteError } = await supabase
    .from("users")
    .delete()
    .eq("id", userId);

  if (deleteError) {
    console.error("User delete failed:", deleteError);
    return NextResponse.json(
      { error: "アカウント削除に失敗しました。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
