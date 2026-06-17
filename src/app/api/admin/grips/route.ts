import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeClubName } from "@/lib/normalize";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const VARIANT_SELECT = "id, size, weight, source, verified";

/** GET /api/admin/grips — グリップモデル一覧（バリアント付き、ページネーション＋検索） */
export async function GET(request: NextRequest) {
  const admin = getAdmin();
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
  const sort = url.searchParams.get("sort") ?? "maker";
  const order = url.searchParams.get("order") === "desc" ? false : true;
  const search = url.searchParams.get("search") ?? "";

  let query = admin
    .from("grip_models")
    .select(`*, variants:grip_variants(${VARIANT_SELECT})`, { count: "exact" });

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

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize });
}

/** POST /api/admin/grips — グリップモデル作成（親のみ） */
export async function POST(request: NextRequest) {
  const admin = getAdmin();
  const body = await request.json();
  const { maker, name } = body;

  if (!maker || !name) {
    return NextResponse.json({ error: "maker and name required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("grip_models")
    .insert({
      maker,
      maker_normalized: normalizeClubName(maker),
      name,
      name_normalized: normalizeClubName(name),
      material: body.material || null,
    })
    .select(`*, variants:grip_variants(${VARIANT_SELECT})`)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "既に存在するグリップモデルです" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/**
 * PATCH /api/admin/grips — 複数アクション対応
 *
 * action: "update"          — モデル更新 { id, action, data }
 * action: "add_variant"     — バリアント追加 { action, model_id, size, weight }
 * action: "update_variant"  — バリアント更新 { action, variant_id, data }
 * action: "delete_variant"  — バリアント削除 { action, variant_id }
 */
export async function PATCH(request: NextRequest) {
  const admin = getAdmin();
  const body = await request.json();
  const { action } = body;

  // --- update model ---
  if (action === "update") {
    const { id, data: updateData } = body;
    if (!id || !updateData) {
      return NextResponse.json({ error: "id and data required" }, { status: 400 });
    }

    const ALLOWED = ["maker", "name", "material", "image_url", "affiliate_url", "verified"];
    const fields: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (key in updateData) fields[key] = updateData[key];
    }
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    if ("maker" in fields) fields.maker_normalized = normalizeClubName(fields.maker);
    if ("name" in fields) fields.name_normalized = normalizeClubName(fields.name);

    const { error } = await admin.from("grip_models").update(fields).eq("id", id);
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "既に存在するグリップモデルです" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: updated } = await admin
      .from("grip_models")
      .select(`*, variants:grip_variants(${VARIANT_SELECT})`)
      .eq("id", id)
      .single();
    return NextResponse.json(updated);
  }

  // --- add variant ---
  if (action === "add_variant") {
    const { model_id, size, weight } = body;
    if (!model_id) {
      return NextResponse.json({ error: "model_id required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("grip_variants")
      .insert({
        model_id,
        size: size || null,
        weight: weight ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "既に存在するバリアントです" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }

  // --- update variant ---
  if (action === "update_variant") {
    const { variant_id, data: updateData } = body;
    if (!variant_id || !updateData) {
      return NextResponse.json({ error: "variant_id and data required" }, { status: 400 });
    }

    const ALLOWED = ["size", "weight", "verified"];
    const fields: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (key in updateData) fields[key] = updateData[key];
    }
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const { error } = await admin.from("grip_variants").update(fields).eq("id", variant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: updated } = await admin.from("grip_variants").select().eq("id", variant_id).single();
    return NextResponse.json(updated);
  }

  // --- delete variant ---
  if (action === "delete_variant") {
    const { variant_id } = body;
    if (!variant_id) {
      return NextResponse.json({ error: "variant_id required" }, { status: 400 });
    }

    const { error } = await admin.from("grip_variants").delete().eq("id", variant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/** DELETE /api/admin/grips — グリップモデル削除（CASCADE でバリアントも削除） */
export async function DELETE(request: NextRequest) {
  const admin = getAdmin();
  const { id } = await request.json();
  const { error } = await admin.from("grip_models").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
