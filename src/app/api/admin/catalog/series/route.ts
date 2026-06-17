import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("catalog_series")
    .select("*, catalog_models(id, name, category)")
    .order("maker")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const maker_slug = body.maker?.toLowerCase().replace(/\s+/g, "-") ?? "";
  const name_slug = body.name?.toLowerCase().replace(/\s+/g, "-") ?? "";
  const { data, error } = await supabase
    .from("catalog_series")
    .insert({ ...body, maker_slug, name_slug })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
