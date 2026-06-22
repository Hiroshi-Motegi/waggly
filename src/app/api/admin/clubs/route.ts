import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { supabaseError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const params = request.nextUrl.searchParams;
  let query = adminClient
    .from("clubs")
    .select("*, users!clubs_user_id_fkey(profiles(nickname)), catalog_models(name, maker)")
    .order("created_at", { ascending: false });

  const search = params.get("search");
  if (search) query = query.or(`maker.ilike.%${search}%,model.ilike.%${search}%`);
  const category = params.get("category");
  if (category) query = query.eq("category", category);
  const linked = params.get("linked");
  if (linked === "true") query = query.not("catalog_model_id", "is", null);
  if (linked === "false") query = query.is("catalog_model_id", null);

  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("page_size") ?? "20");
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) return supabaseError(error);
  return NextResponse.json({ items: data ?? [], total: count ?? 0, page, pageSize });
}
