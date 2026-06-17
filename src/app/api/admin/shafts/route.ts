import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeClubName } from "@/lib/normalize";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** GET /api/admin/shafts — シャフト一覧（ページネーション＋検索） */
export async function GET(request: NextRequest) {
  const admin = getAdmin();
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
  const sort = url.searchParams.get("sort") ?? "maker";
  const order = url.searchParams.get("order") === "desc" ? false : true;
  const search = url.searchParams.get("search") ?? "";

  let query = admin
    .from("shafts")
    .select("*", { count: "exact" });

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

/** POST /api/admin/shafts — シャフト作成 */
export async function POST(request: NextRequest) {
  const admin = getAdmin();
  const body = await request.json();
  const { maker, name, flex } = body;

  if (!maker || !name) {
    return NextResponse.json({ error: "maker and name required" }, { status: 400 });
  }

  const row = {
    maker,
    maker_normalized: normalizeClubName(maker),
    name,
    name_normalized: normalizeClubName(name),
    flex: flex || null,
    type: body.type || null,
    weight: body.weight ?? null,
    torque: body.torque ?? null,
    kick_point: body.kick_point || null,
    image_url: body.image_url || null,
    affiliate_url: body.affiliate_url || null,
    source: body.source || "manual",
    verified: body.verified ?? false,
  };

  const { data, error } = await admin
    .from("shafts")
    .insert(row)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "既に存在するシャフトです" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/** PATCH /api/admin/shafts — body: { id, data: {...} } */
export async function PATCH(request: NextRequest) {
  const admin = getAdmin();
  const { id, data: updateData } = await request.json();

  if (!id || !updateData) {
    return NextResponse.json({ error: "id and data required" }, { status: 400 });
  }

  const { data: existing } = await admin.from("shafts").select("*").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ALLOWED = [
    "maker", "name", "type", "flex", "weight", "torque", "kick_point",
    "image_url", "affiliate_url", "own_image_url", "source", "verified",
  ];
  const fields: Record<string, any> = {};
  for (const key of ALLOWED) {
    if (key in updateData) fields[key] = updateData[key];
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  // Re-normalize if identity fields changed
  if ("maker" in fields) fields.maker_normalized = normalizeClubName(fields.maker);
  if ("name" in fields) fields.name_normalized = normalizeClubName(fields.name);

  const { error } = await admin.from("shafts").update(fields).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "既に存在するシャフトです" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: updated } = await admin.from("shafts").select("*").eq("id", id).single();
  return NextResponse.json(updated);
}

/** DELETE /api/admin/shafts — body: { id } */
export async function DELETE(request: NextRequest) {
  const admin = getAdmin();
  const { id } = await request.json();
  await admin.from("shafts").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
