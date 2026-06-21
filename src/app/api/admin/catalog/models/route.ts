import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

const createModelSchema = z.object({
  name: z.string().min(1).max(200),
  maker: z.string().min(1).max(100),
  maker_id: z.string().uuid(),
  maker_slug: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  category_slug: z.string().min(1).max(50),
  slug: z.string().min(1).max(200).optional(),
  image_url: z.string().url().optional().nullable(),
  description: z.string().max(2000).optional(),
  price: z.number().optional().nullable(),
  release_year: z.number().int().optional().nullable(),
  release_month: z.number().int().min(1).max(12).optional().nullable(),
  is_visible: z.boolean().optional(),
});

const updateModelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  maker: z.string().max(100).optional(),
  maker_id: z.string().uuid().optional(),
  maker_slug: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  category_slug: z.string().max(50).optional(),
  slug: z.string().max(200).optional(),
  image_url: z.string().url().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  price: z.number().optional().nullable(),
  release_year: z.number().int().optional().nullable(),
  release_month: z.number().int().min(1).max(12).optional().nullable(),
  is_visible: z.boolean().optional(),
  verification_status: z.enum(["verified", "in_review", "unverified"]).optional(),
  spec_updated_at: z.string().optional().nullable(),
});

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()),
  is_visible: z.boolean().optional(),
  verification_status: z.enum(["verified", "in_review", "unverified"]).optional(),
});

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const params = request.nextUrl.searchParams;
  const noSpecs = params.get("no_specs") === "true";

  // When no_specs filter is active, we can't paginate at DB level
  // because the filter is based on spec count. Fetch all and paginate in memory.
  let query = adminClient
    .from("catalog_models")
    .select("*, catalog_specs(count)", { count: "exact" })
    .order("maker")
    .order("name");

  const search = params.get("search");
  if (search) query = query.ilike("name", `%${search}%`);
  const makerSlug = params.get("maker_slug");
  if (makerSlug) query = query.eq("maker_slug", makerSlug);
  const category = params.get("category");
  if (category) query = query.eq("category", category);
  const releaseYear = params.get("release_year");
  if (releaseYear) query = query.eq("release_year", Number(releaseYear));
  const isVisible = params.get("is_visible");
  if (isVisible !== null) query = query.eq("is_visible", isVisible === "true");
  const verification = params.get("verification_status");
  if (verification) query = query.eq("verification_status", verification);

  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("page_size") ?? "20");

  if (!noSpecs) {
    // Normal pagination at DB level
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);
  }

  const { data, error, count } = await query;
  if (error) return supabaseError(error);

  let items = data ?? [];
  let total = count ?? items.length;

  if (noSpecs) {
    // Filter in memory, then paginate
    items = items.filter((m) => (m.catalog_specs as [{ count: number }])?.[0]?.count === 0);
    total = items.length;
    const from = (page - 1) * pageSize;
    items = items.slice(from, from + pageSize);
  }

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = createModelSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { data, error } = await adminClient
    .from("catalog_models")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();

  // Discriminate by presence of "ids" field
  if (Array.isArray(raw.ids)) {
    const bulk = bulkUpdateSchema.safeParse(raw);
    if (!bulk.success) return badRequest(bulk.error.issues[0].message);
    const { ids, ...updates } = bulk.data;
    const { error } = await adminClient.from("catalog_models").update(updates).in("id", ids);
    if (error) return supabaseError(error);
    return NextResponse.json({ updated: ids.length });
  }

  // Single update
  const parsed = updateModelSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);
  const { id, ...updates } = parsed.data;
  const { data, error } = await adminClient
    .from("catalog_models")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

const deleteModelSchema = z.object({ id: z.string().uuid() });

export async function DELETE(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = deleteModelSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { error } = await adminClient.from("catalog_models").delete().eq("id", parsed.data.id);
  if (error) return supabaseError(error);
  return NextResponse.json({ success: true });
}
