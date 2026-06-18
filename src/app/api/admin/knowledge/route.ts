import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

const createKnowledgeSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(10000),
  category: z.string().min(1).max(100).optional(),
  status: z.enum(["draft", "active", "inactive", "rejected"]).optional(),
  source: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const category = request.nextUrl.searchParams.get("category");
  const status = request.nextUrl.searchParams.get("status");

  let query = adminClient
    .from("knowledge_base")
    .select("*")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = createKnowledgeSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { data, error } = await adminClient
    .from("knowledge_base")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
}
