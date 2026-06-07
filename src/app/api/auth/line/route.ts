import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const { lineUserId, displayName, avatarUrl } = await request.json();

  if (!lineUserId || !displayName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Check if user exists
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("line_user_id", lineUserId)
    .single();

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    await supabaseAdmin
      .from("users")
      .update({ display_name: displayName, avatar_url: avatarUrl })
      .eq("id", userId);
  } else {
    const email = `${lineUserId}@line.waggly.app`;
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId, display_name: displayName },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    userId = authUser.user.id;

    await supabaseAdmin.from("users").insert({
      id: userId,
      line_user_id: lineUserId,
      display_name: displayName,
      avatar_url: avatarUrl,
    });
  }

  const { data: session, error: sessionError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: `${lineUserId}@line.waggly.app`,
    });

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  return NextResponse.json({
    userId,
    verificationUrl: session.properties?.action_link,
  });
}
