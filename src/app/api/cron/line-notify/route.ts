import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/api";

type NotificationType = "add_club" | "share_card";

interface NotifyTarget {
  line_user_id: string;
  user_id: string;
}

async function fetchTargets(
  supabase: ReturnType<typeof getAdminClient>,
  type: NotificationType
): Promise<NotifyTarget[]> {
  if (type === "add_club") {
    const { data, error } = await supabase.rpc("get_line_notify_add_club");
    if (error) throw new Error(`add_club query failed: ${error.message}`);
    return (data ?? []) as NotifyTarget[];
  } else {
    const { data, error } = await supabase.rpc("get_line_notify_share_card");
    if (error) throw new Error(`share_card query failed: ${error.message}`);
    return (data ?? []) as NotifyTarget[];
  }
}

async function logAndSend(
  supabase: ReturnType<typeof getAdminClient>,
  targets: NotifyTarget[],
  type: NotificationType,
  message: string
): Promise<number> {
  let sent = 0;
  for (const { line_user_id, user_id } of targets) {
    // ログ先行挿入（intent-to-send: 挿入成功したユーザーのみ送信）
    const { data: inserted } = await supabase
      .from("line_notification_logs")
      .insert({ user_id, notification_type: type })
      .select("id");

    // 競合（既送信）の場合はスキップ
    if (!inserted || inserted.length === 0) continue;

    try {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: line_user_id,
          messages: [{ type: "text", text: message }],
        }),
      });
      if (res.ok) {
        sent++;
      }
      // at most once: ログ挿入済みのため失敗（友達未追加 403、rate limit 429 等）でも再送しない
    } catch {
      // at most once: ネットワークエラーもログを残したまま再送しない
    }
  }
  return sent;
}

export async function POST(req: Request) {
  // 認証（既存 cron と同じ timing-safe 比較）
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "";
  if (!authHeader || !expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const bufA = Buffer.from(authHeader);
  const bufB = Buffer.from(expected);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  const addClubTargets = await fetchTargets(supabase, "add_club");
  const addClubSent = await logAndSend(
    supabase,
    addClubTargets,
    "add_club",
    "マイクラブを追加してみませんか？　ゴルフクラブを登録するとスコアやメモを管理できます。"
  );

  const shareCardTargets = await fetchTargets(supabase, "share_card");
  const shareCardSent = await logAndSend(
    supabase,
    shareCardTargets,
    "share_card",
    "名刺を共有してみませんか？　ユーザー名を設定するとゴルファー名刺を友達に共有できます。"
  );

  return NextResponse.json({ add_club: addClubSent, share_card: shareCardSent });
}
