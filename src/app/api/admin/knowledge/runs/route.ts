import { NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const { data, error } = await adminClient
    .from("knowledge_auto_runs")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(10);

  if (error) return supabaseError(error);
  return NextResponse.json(data);
}
