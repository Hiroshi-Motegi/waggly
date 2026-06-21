import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(10000).optional(),
  category: z.enum(["info", "feature", "maintenance", "campaign"]).optional(),
  published_at: z.string().optional(),
  is_published: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const params = request.nextUrl.searchParams;
  let query = adminClient.from("announcements").select("*").order("published_at", { ascending: false });

  const category = params.get("category");
  if (category) query = query.eq("category", category);
  const status = params.get("status");
  if (status === "published") query = query.eq("is_published", true);
  if (status === "draft") query = query.eq("is_published", false);

  const { data, error } = await query;
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { data, error } = await adminClient
    .from("announcements")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
}
