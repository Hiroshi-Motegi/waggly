import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export const dynamic = "force-static";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("price", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
