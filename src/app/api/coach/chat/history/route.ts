import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";


export async function DELETE(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("ai_chats")
    .delete()
    .eq("user_id", userId)
    .eq("conversation_id", conversationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const conversationId = request.nextUrl.searchParams.get("conversationId");

  if (request.nextUrl.searchParams.get("list") === "true") {
    // Get all unique conversations with their first message
    const { data, error } = await supabase
      .from("ai_chats")
      .select("conversation_id, message, created_at, role")
      .eq("user_id", userId)
      .eq("role", "user")
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Group by conversation_id, take first user message as title
    const conversations = new Map<string, { id: string; title: string; created_at: string }>();
    for (const msg of data ?? []) {
      if (!conversations.has(msg.conversation_id)) {
        conversations.set(msg.conversation_id, {
          id: msg.conversation_id,
          title: msg.message.length > 30 ? msg.message.substring(0, 30) + "..." : msg.message,
          created_at: msg.created_at,
        });
      }
    }

    // Return as array, newest first
    const list = Array.from(conversations.values()).reverse();
    return NextResponse.json(list);
  }

  if (conversationId) {
    // Fetch specific conversation
    const { data, error } = await supabase
      .from("ai_chats")
      .select("*")
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Fetch latest conversation ID
  const { data: latest } = await supabase
    .from("ai_chats")
    .select("conversation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return NextResponse.json({ conversationId: null, messages: [] });

  const { data, error } = await supabase
    .from("ai_chats")
    .select("*")
    .eq("user_id", userId)
    .eq("conversation_id", latest.conversation_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversationId: latest.conversation_id, messages: data });
}
