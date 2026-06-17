import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { lookupRakutenUrl } from "@/lib/rakuten-search";
import { normalizeClubName } from "@/lib/normalize";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** GET /api/admin/series — 全シリーズ + 紐づくspec一覧 */
export async function GET(request: NextRequest) {
  const admin = getAdmin();
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
  const sort = url.searchParams.get("sort") ?? "maker";
  const order = url.searchParams.get("order") === "desc" ? false : true;

  const category = url.searchParams.get("category");

  let query = admin
    .from("club_models")
    .select("*, heads(id, category, club_number, loft, verified)", { count: "exact" });

  if (category) query = query.eq("category", category);

  const { data, error, count } = await query
    .order(sort, { ascending: order })
    .order("model", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (data ?? []).map((s: any) => {
    const specs = (s.heads ?? []).sort((a: any, b: any) =>
      (a.club_number ?? "").localeCompare(b.club_number ?? "")
    );
    return { ...s, specs, spec_count: specs.length, heads: undefined };
  });
  return NextResponse.json({ data: result, total: count ?? 0, page, pageSize });
}

/** POST /api/admin/series — シリーズ作成 */
export async function POST(request: NextRequest) {
  const admin = getAdmin();
  const { maker, model, category } = await request.json();

  if (!maker || !model) {
    return NextResponse.json({ error: "maker and model required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("club_models")
    .insert({ maker, model, ...(category ? { category } : {}) })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "既に存在するシリーズです" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/**
 * PATCH /api/admin/series
 * body: { id, action: "update" | "lookup_rakuten", data?: Record<string,any> }
 */
export async function PATCH(request: NextRequest) {
  const admin = getAdmin();
  const { id, action, data: updateData } = await request.json();

  const { data: series } = await admin.from("club_models").select("*").eq("id", id).single();
  if (!series) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "lookup_rakuten" && updateData?.url) {
    const result = await lookupRakutenUrl(updateData.url);
    if (!result.imageUrl && !result.affiliateUrl) {
      return NextResponse.json({ error: "商品が見つかりませんでした" }, { status: 404 });
    }
    const updates: Record<string, any> = {};
    if (result.imageUrl) updates.image_url = result.imageUrl;
    if (result.affiliateUrl) updates.affiliate_url = result.affiliateUrl;
    await admin.from("club_models").update(updates).eq("id", id);
    const { data: updated } = await admin.from("club_models").select("*").eq("id", id).single();
    return NextResponse.json(updated);
  }

  if (action === "update" && updateData) {
    const ALLOWED = ["maker", "model", "category", "image_url", "affiliate_url", "verified"];
    const fields: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (key in updateData) fields[key] = updateData[key];
    }
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }
    await admin.from("club_models").update(fields).eq("id", id);

    // When maker or model changes, cascade to all linked heads
    if ("maker" in fields || "model" in fields) {
      const headUpdates: Record<string, any> = {};
      if ("maker" in fields) {
        headUpdates.maker = fields.maker;
        headUpdates.maker_normalized = normalizeClubName(fields.maker);
      }
      if ("model" in fields) {
        headUpdates.model = fields.model;
        headUpdates.model_normalized = normalizeClubName(fields.model);
      }
      await admin.from("heads").update(headUpdates).eq("model_id", id);
    }

    const { data: updated } = await admin.from("club_models").select("*").eq("id", id).single();
    return NextResponse.json(updated);
  }

  // シリーズにspecを紐づけ
  if (action === "assign_specs") {
    // maker+model が一致する heads を全て紐づけ
    const { count } = await admin
      .from("heads")
      .update({ model_id: id })
      .eq("maker", series.maker)
      .eq("model", series.model);

    const { data: updated } = await admin.from("club_models").select("*").eq("id", id).single();
    return NextResponse.json({ ...updated, assigned: count });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/** DELETE /api/admin/series — シリーズ削除（headsのmodel_idはON DELETE SET NULLで解除） */
export async function DELETE(request: NextRequest) {
  const admin = getAdmin();
  const { id } = await request.json();
  await admin.from("club_models").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
