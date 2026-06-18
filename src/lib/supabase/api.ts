import { createClient } from "@/lib/supabase/server";
import { createClient as createRawClient, type SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

let cachedDevUserId: string | null = null;

function isDevMode() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true"
  );
}

export function getAdminClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Create a user-scoped Supabase client from a Bearer token.
 * Uses anon key + user JWT so RLS policies apply.
 */
function createUserClient(token: string) {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

/**
 * auth_user_id → users.id 逆引き（user_providers 経由）。
 */
async function resolveUserId(authUserId: string): Promise<string | null> {
  const adminClient = getAdminClient();
  const { data } = await adminClient
    .from("user_providers")
    .select("user_id")
    .eq("auth_user_id", authUserId)
    .limit(1)
    .maybeSingle();
  return data?.user_id ?? null;
}

/**
 * Get Supabase client and userId for API routes.
 * Returns null if not authenticated (caller should return 401).
 *
 * The returned `supabase` is a user-scoped client (RLS applies via
 * get_my_user_id() SECURITY DEFINER function — see migration 232).
 * Use `getAdminClient()` explicitly for storage or admin operations.
 * userId is users.id (independent UUID), NOT auth.users.id.
 */
type AppSupabaseClient = SupabaseClient;

export async function getApiAuth(): Promise<{
  supabase: AppSupabaseClient;
  userId: string;
} | null> {
  if (isDevMode()) {
    const supabase = getAdminClient();

    if (cachedDevUserId) {
      return { supabase, userId: cachedDevUserId };
    }

    // Check if dev user exists via user_providers
    const { data: existingProvider } = await supabase
      .from("user_providers")
      .select("user_id")
      .eq("provider", "dev")
      .eq("provider_sub", "dev-user")
      .maybeSingle();

    if (existingProvider) {
      cachedDevUserId = existingProvider.user_id;
      return { supabase, userId: cachedDevUserId! };
    }

    // Create dev user + provider
    const { data: newUser } = await supabase
      .from("users")
      .insert({ display_name: "開発ユーザー" })
      .select("id")
      .single();

    if (!newUser) return null;

    await supabase.from("user_providers").insert({
      user_id: newUser.id,
      provider: "dev",
      provider_sub: "dev-user",
    });

    cachedDevUserId = newUser.id;
    return { supabase, userId: newUser.id };
  }

  // Native app: Bearer token auth
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const adminClient = getAdminClient();
    const {
      data: { user },
      error,
    } = await adminClient.auth.getUser(token);
    if (error || !user) return null;

    const userId = await resolveUserId(user.id);
    if (!userId) return null;

    // RLS applies via get_my_user_id() SECURITY DEFINER function
    return { supabase: createUserClient(token), userId };
  }

  // Production: cookie-based auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const userId = await resolveUserId(user.id);
  if (!userId) return null;

  // SSR client is already user-scoped (RLS applies)
  return { supabase, userId };
}

/**
 * getApiAuth() variant that also returns auth_user_id.
 * Used by auth APIs (resolve-session, etc.) that need both IDs.
 *
 * NOTE: Returns adminClient since auth routes need elevated access
 * for cross-user operations (conflict resolution, account linking, etc.).
 */
export async function getApiAuthWithAuthUserId(): Promise<{
  supabase: AppSupabaseClient;
  authUserId: string;
  userId: string | null;
} | null> {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  const adminClient = getAdminClient();

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const {
      data: { user },
      error,
    } = await adminClient.auth.getUser(token);
    if (error || !user) return null;

    const userId = await resolveUserId(user.id);
    return { supabase: adminClient, authUserId: user.id, userId };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const userId = await resolveUserId(user.id);
  return { supabase: adminClient, authUserId: user.id, userId };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
