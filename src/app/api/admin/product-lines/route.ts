import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeClubName } from "@/lib/normalize";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** GET /api/admin/product-lines — プロダクトライン一覧（sets数付き） */
export async function GET(request: NextRequest) {
  const admin = getAdmin();
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
  const sort = url.searchParams.get("sort") ?? "maker";
  const order = url.searchParams.get("order") === "desc" ? false : true;
  const search = url.searchParams.get("search") ?? "";

  let query = admin
    .from("product_lines")
    .select("*, sets(id)", { count: "exact" });

  if (search) {
    const norm = normalizeClubName(search);
    query = query.or(`maker_normalized.ilike.%${norm}%,name_normalized.ilike.%${norm}%`);
  }

  query = query
    .order(sort, { ascending: order })
    .order("name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (data ?? []).map((pl: any) => ({
    ...pl,
    set_count: (pl.sets ?? []).length,
    sets: undefined,
  }));

  return NextResponse.json({ data: result, total: count ?? 0, page, pageSize });
}

/** POST /api/admin/product-lines — プロダクトライン作成 */
export async function POST(request: NextRequest) {
  const admin = getAdmin();
  const { maker, name } = await request.json();

  if (!maker || !name) {
    return NextResponse.json({ error: "maker and name required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("product_lines")
    .insert({
      maker,
      maker_normalized: normalizeClubName(maker),
      name,
      name_normalized: normalizeClubName(name),
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "既に存在するプロダクトラインです" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/**
 * PATCH /api/admin/product-lines
 * body: { id, action: "update", data: { maker, name, image_url, affiliate_url, verified } }
 */
export async function PATCH(request: NextRequest) {
  const admin = getAdmin();
  const { id, action, data: updateData } = await request.json();

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (action === "update" && updateData) {
    const ALLOWED = ["maker", "name", "image_url", "affiliate_url", "verified"];
    const fields: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (key in updateData) fields[key] = updateData[key];
    }
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    if ("maker" in fields) fields.maker_normalized = normalizeClubName(fields.maker);
    if ("name" in fields) fields.name_normalized = normalizeClubName(fields.name);

    const { error } = await admin.from("product_lines").update(fields).eq("id", id);
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "既に存在するプロダクトラインです" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: updated } = await admin
      .from("product_lines")
      .select("*, sets(id)")
      .eq("id", id)
      .single();

    return NextResponse.json({
      ...updated,
      set_count: (updated?.sets ?? []).length,
      sets: undefined,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/** DELETE /api/admin/product-lines — プロダクトライン削除（CASCADE で sets も削除） */
export async function DELETE(request: NextRequest) {
  const admin = getAdmin();
  const { id } = await request.json();
  const { error } = await admin.from("product_lines").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
