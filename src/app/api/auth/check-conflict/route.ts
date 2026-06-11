import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider, providerUserId, currentWid } = body;

  if (!provider || !providerUserId) {
    return NextResponse.json(
      { error: "Missing provider or providerUserId" },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Look up existing user by provider ID
  let existingUser = null;
  if (provider === "google") {
    const { data } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("google_id", providerUserId)
      .maybeSingle();
    existingUser = data;
  } else if (provider === "line") {
    const { data } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("line_user_id", providerUserId)
      .maybeSingle();
    existingUser = data;
  } else if (provider === "apple") {
    return NextResponse.json({ conflict: false });
  }

  if (!existingUser) {
    return NextResponse.json({ conflict: false });
  }

  if (currentWid && existingUser.id === currentWid) {
    return NextResponse.json({ conflict: false });
  }

  // Conflict found — return data summary for the existing user
  const existingSummary = await getUserDataSummary(supabaseAdmin, existingUser.id);

  const result: any = {
    conflict: true,
    existingUser: {
      wid: existingUser.id,
      displayName: existingUser.display_name,
      ...existingSummary,
    },
  };

  if (currentWid) {
    const currentSummary = await getUserDataSummary(supabaseAdmin, currentWid);
    const { data: currentUser } = await supabaseAdmin
      .from("users")
      .select("display_name")
      .eq("id", currentWid)
      .single();
    result.currentUser = {
      wid: currentWid,
      displayName: currentUser?.display_name ?? "",
      ...currentSummary,
    };
  }

  return NextResponse.json(result);
}

async function getUserDataSummary(supabase: any, userId: string) {
  const [clubsRes, practicesRes, accessoriesRes] = await Promise.all([
    supabase.from("clubs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("practice_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("accessories").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const [latestClub, latestPractice, latestAccessory] = await Promise.all([
    supabase.from("clubs").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("practice_sessions").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("accessories").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const dates = [
    latestClub.data?.created_at,
    latestPractice.data?.created_at,
    latestAccessory.data?.created_at,
  ].filter(Boolean) as string[];

  return {
    lastUpdated: dates.length > 0 ? dates.sort().reverse()[0] : null,
    counts: {
      clubs: clubsRes.count ?? 0,
      practices: practicesRes.count ?? 0,
      accessories: accessoriesRes.count ?? 0,
    },
  };
}
