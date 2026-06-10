import { createClient } from "@/lib/supabase/server";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const DEV_EMAIL = "dev@waggly.local";
const DEV_PASSWORD = "devpassword123";

let cachedDevUserId: string | null = null;

function isDevMode() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true"
  );
}

/**
 * Get Supabase client and userId for API routes.
 * Returns null if not authenticated (caller should return 401).
 */
export async function getApiAuth(): Promise<{
  supabase: any;
  userId: string;
} | null> {
  if (isDevMode()) {
    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Use cached ID if available
    if (cachedDevUserId) {
      return { supabase, userId: cachedDevUserId };
    }

    // Check if dev user exists by email
    const { data: existingUsers } = await supabase
      .from("users")
      .select("id")
      .eq("line_user_id", "dev-line-id")
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      cachedDevUserId = existingUsers[0].id;
      return { supabase, userId: cachedDevUserId! };
    }

    // Create auth user first (Supabase assigns the UUID)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: "開発ユーザー" },
    });

    if (authError) {
      // User might already exist in auth but not in users table
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existing = users?.find((u: any) => u.email === DEV_EMAIL);
      if (existing) {
        // Insert profile with auth user's ID
        await supabase.from("users").upsert({
          id: existing.id,
          line_user_id: "dev-line-id",
          display_name: "開発ユーザー",
          avatar_url: null,
        });
        cachedDevUserId = existing.id;
        return { supabase, userId: cachedDevUserId! };
      }
      return null;
    }

    const authUserId = authData.user.id;

    // Create profile using the auth-assigned UUID
    await supabase.from("users").insert({
      id: authUserId,
      line_user_id: "dev-line-id",
      display_name: "開発ユーザー",
      avatar_url: null,
    });

    cachedDevUserId = authUserId;
    return { supabase, userId: authUserId };
  }

  // Native app: Bearer token auth
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // Verify token with admin client
    const adminClient = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const {
      data: { user },
      error,
    } = await adminClient.auth.getUser(token);
    if (error || !user) return null;
    // Return user-scoped client (RLS enforced) instead of service role
    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    return { supabase, userId: user.id };
  }

  // Production: cookie-based auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return { supabase: supabase as any, userId: user.id };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
