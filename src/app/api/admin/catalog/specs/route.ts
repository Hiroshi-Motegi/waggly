import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const modelId = request.nextUrl.searchParams.get("model_id");
  if (!modelId) return NextResponse.json({ error: "model_id required" }, { status: 400 });
  const { data, error } = await supabase
    .from("catalog_specs")
    .select("*")
    .eq("model_id", modelId)
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const rows = Array.isArray(body) ? body : [body];
  const { data, error } = await supabase
    .from("catalog_specs")
    .insert(rows)
    .select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
