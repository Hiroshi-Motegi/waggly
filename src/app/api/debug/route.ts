import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "dev only" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: users } = await supabase
    .from("users")
    .select("id, display_name, created_at");

  const { data: providers } = await supabase
    .from("user_providers")
    .select("user_id, provider, provider_sub");

  // Group providers by user_id
  const providersByUser: Record<string, Array<{ provider: string; provider_sub: string }>> = {};
  for (const p of providers ?? []) {
    if (!providersByUser[p.user_id]) providersByUser[p.user_id] = [];
    providersByUser[p.user_id].push({ provider: p.provider, provider_sub: p.provider_sub });
  }

  // Mask sensitive IDs but show enough to identify
  const masked = (users ?? []).map((u: { id: string; display_name: string; created_at: string }) => ({
    id: u.id?.substring(0, 8) + "...",
    display_name: u.display_name,
    providers: (providersByUser[u.id] ?? []).map((p) => ({
      provider: p.provider,
      provider_sub: p.provider_sub
        ? p.provider_sub.substring(0, 10) + "..."
        : null,
    })),
    created_at: u.created_at,
  }));

  return NextResponse.json({ users: masked, count: masked.length });
}
