import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError } from "@/lib/api-error";


export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("price", { ascending: true });

  if (error) return supabaseError(error);
  return NextResponse.json(data);
}
