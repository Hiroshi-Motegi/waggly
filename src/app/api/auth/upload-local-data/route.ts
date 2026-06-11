import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { createClient } from "@supabase/supabase-js";
import { insertLocalData } from "@/lib/insert-local-data";

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const { localData } = await request.json();
  if (!localData) {
    return NextResponse.json({ error: "Missing localData" }, { status: 400 });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await insertLocalData(supabaseAdmin, auth.userId, localData);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[upload-local-data] Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
