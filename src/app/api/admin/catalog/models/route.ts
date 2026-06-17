import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const seriesId = request.nextUrl.searchParams.get("series_id");
  let query = supabase.from("catalog_models").select("*, catalog_series(*), catalog_specs(count)").order("category");
  if (seriesId) query = query.eq("series_id", seriesId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const category_slug = body.category ?? "";
  const { data, error } = await supabase
    .from("catalog_models")
    .insert({ ...body, category_slug })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
