import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { supabaseError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const params = request.nextUrl.searchParams;
  let query = adminClient
    .from("accessories")
    .select("*, users!accessories_user_id_fkey(display_name)")
    .order("created_at", { ascending: false });

  const search = params.get("search");
  if (search) query = query.or(`brand.ilike.%${search}%,model.ilike.%${search}%`);
  const category = params.get("category");
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}
