import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

export function generateStaticParams() {
  return [{ id: "_" }];
}

const updateKnowledgeSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(10000).optional(),
  category: z.string().min(1).max(100).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  source: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const raw = await request.json();
  const parsed = updateKnowledgeSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from("knowledge_base")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
  if (error) return supabaseError(error);
  return NextResponse.json({ success: true });
}
