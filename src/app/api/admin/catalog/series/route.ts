import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

const createSeriesSchema = z.object({
  maker: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  year: z.number().int().optional(),
  category: z.string().optional(),
  description: z.string().max(2000).optional(),
});

export async function GET() {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("catalog_series")
    .select("*, catalog_models(id, name, category)")
    .order("maker")
    .order("name");
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const raw = await request.json();
  const parsed = createSeriesSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const body = parsed.data;
  const maker_slug = body.maker.toLowerCase().replace(/\s+/g, "-");
  const name_slug = body.name.toLowerCase().replace(/\s+/g, "-");

  const { data, error } = await supabase
    .from("catalog_series")
    .insert({ ...body, maker_slug, name_slug })
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
}
