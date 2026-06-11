import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { insertLocalData } from "@/lib/insert-local-data";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { scenario, provider, providerUserId, choice, winnerWid, loserWid, localData } = body;

  if (!scenario || !provider || !providerUserId || !choice) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    if (scenario === "first-signin") {
      return await handleFirstSignin(supabaseAdmin, { provider, providerUserId, choice, localData });
    }
    if (scenario === "account-linking") {
      return await handleAccountLinking(supabaseAdmin, { provider, providerUserId, choice, winnerWid, loserWid });
    }
    return NextResponse.json({ error: "Unknown scenario" }, { status: 400 });
  } catch (e: any) {
    console.error("[resolve-conflict] Error:", e);
    return NextResponse.json({ error: e.message ?? "Conflict resolution failed" }, { status: 500 });
  }
}

async function handleFirstSignin(
  supabase: any,
  opts: { provider: string; providerUserId: string; choice: string; localData?: any }
) {
  const existingUser = await findUserByProvider(supabase, opts.provider, opts.providerUserId);
  if (!existingUser) {
    return NextResponse.json({ error: "Existing user not found" }, { status: 404 });
  }

  if (opts.choice === "local" && opts.localData) {
    await deleteUserData(supabase, existingUser.id);
    await insertLocalData(supabase, existingUser.id, opts.localData);
  }

  const session = await createSessionForUser(supabase, existingUser.id);
  return NextResponse.json({ success: true, userId: existingUser.id, ...(session ?? {}) });
}

async function handleAccountLinking(
  supabase: any,
  opts: { provider: string; providerUserId: string; choice: string; winnerWid?: string; loserWid?: string }
) {
  const { winnerWid, loserWid } = opts;
  if (!winnerWid || !loserWid) {
    return NextResponse.json({ error: "Missing winnerWid or loserWid" }, { status: 400 });
  }

  await deleteUserData(supabase, loserWid);
  await supabase.from("users").delete().eq("id", loserWid);
  await supabase.auth.admin.deleteUser(loserWid);

  await transferProvider(supabase, winnerWid, opts.provider, opts.providerUserId);

  let session = null;
  if (opts.choice === "existing") {
    session = await createSessionForUser(supabase, winnerWid);
  }

  return NextResponse.json({ success: true, userId: winnerWid, ...(session ?? {}) });
}

async function findUserByProvider(supabase: any, provider: string, providerUserId: string) {
  const column = provider === "google" ? "google_id" : "line_user_id";
  const { data } = await supabase.from("users").select("*").eq(column, providerUserId).maybeSingle();
  return data;
}

async function deleteUserData(supabase: any, userId: string) {
  await supabase.from("favorite_courses").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", userId);
  await supabase.from("practice_sessions").delete().eq("user_id", userId);
  await supabase.from("accessories").delete().eq("user_id", userId);
  await supabase.from("clubs").delete().eq("user_id", userId);
}

async function transferProvider(supabase: any, userId: string, provider: string, providerUserId: string) {
  if (provider === "google") {
    await supabase.from("users").update({ google_id: providerUserId }).eq("id", userId);
  } else if (provider === "line") {
    await supabase.from("users").update({ line_user_id: providerUserId }).eq("id", userId);
  }
}

async function createSessionForUser(supabase: any, userId: string) {
  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
  if (!authUser?.email) return null;

  const tempPassword = crypto.randomUUID();
  await supabase.auth.admin.updateUserById(userId, { password: tempPassword });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: authUser.email,
    password: tempPassword,
  });

  if (error || !data.session) {
    console.error("[resolve-conflict] Session creation failed:", error);
    return null;
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}
