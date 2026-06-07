import { createClient } from "@/lib/supabase/server";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

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

    // Ensure dev user exists in DB
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("id", DEV_USER_ID)
      .single();

    if (!existing) {
      // Create auth user first
      const { data: authData } = await supabase.auth.admin.createUser({
        email: "dev@waggly.local",
        password: "devpassword123",
        email_confirm: true,
        user_metadata: { display_name: "開発ユーザー" },
      });

      const authUserId = authData?.user?.id ?? DEV_USER_ID;

      await supabase.from("users").upsert({
        id: authUserId,
        line_user_id: "dev-line-id",
        display_name: "開発ユーザー",
        avatar_url: null,
      });

      // Return with actual auth user ID
      return { supabase, userId: authUserId };
    }

    return { supabase, userId: DEV_USER_ID };
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
