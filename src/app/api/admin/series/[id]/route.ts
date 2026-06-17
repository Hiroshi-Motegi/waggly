import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getAdmin();
  const { data, error } = await admin
    .from("sets")
    .select(`
      *,
      product_line:product_lines(id, maker, name),
      heads(id, category, club_number, sort_order, loft, lie, bounce, head_volume, head_weight, distance, verified,
        configurations:clubs(id, shaft_variant_id, length, total_weight, swing_weight)
      ),
      series_shafts:set_shafts(id, is_default, shaft_model:shaft_models(id, maker, name, type, variants:shaft_variants(id, flex, weight, torque, kick_point)))
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("[series/[id] GET]", error?.message, error?.details, error?.hint);
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  // Build specs with all configurations (not just default)
  const specs = (data.heads ?? [])
    .map((sp: any) => {
      const { configurations, ...rest } = sp;
      return { ...rest, configurations: configurations ?? [] };
    })
    .sort((a: any, b: any) => {
      const sa = a.sort_order ?? 9999;
      const sb = b.sort_order ?? 9999;
      if (sa !== sb) return sa - sb;
      return (a.club_number ?? "").localeCompare(b.club_number ?? "");
    });

  // Build shafts list
  const shafts = (data.series_shafts ?? [])
    .map((ss: any) => ({
      link_id: ss.id,
      is_default: ss.is_default,
      shaft_model: ss.shaft_model,
    }));

  return NextResponse.json({
    ...data,
    specs,
    spec_count: specs.length,
    shafts,
    heads: undefined,
    series_shafts: undefined,
  });
}

/** PATCH — shaft linking + configuration updates */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: seriesId } = await params;
  const admin = getAdmin();
  const { action, ...body } = await request.json();

  // Add shaft to series
  if (action === "add_shaft") {
    const { shaft_model_id, is_default } = body;
    const { data, error } = await admin
      .from("set_shafts")
      .insert({ set_id: seriesId, shaft_model_id, is_default: is_default ?? false })
      .select("id, is_default, shaft_model:shaft_models(id, maker, name, type, variants:shaft_variants(id, flex, weight, torque, kick_point))")
      .single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "既に追加済みです" }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ link_id: data.id, is_default: data.is_default, shaft_model: (data as any).shaft_model });
  }

  // Remove shaft from series
  if (action === "remove_shaft") {
    const { link_id, shaft_model_id } = body;
    await admin.from("set_shafts").delete().eq("id", link_id);
    const { data: variants } = await admin.from("shaft_variants").select("id").eq("model_id", shaft_model_id);
    if (variants && variants.length > 0) {
      const variantIds = variants.map((v: any) => v.id);
      const { data: headRows } = await admin.from("heads").select("id").eq("set_id", seriesId);
      if (headRows && headRows.length > 0) {
        const headIds = headRows.map((h: any) => h.id);
        await admin.from("clubs").delete()
          .in("shaft_variant_id", variantIds)
          .in("head_id", headIds);
      }
    }
    return NextResponse.json({ ok: true });
  }

  // Upsert configuration (head_id + shaft_variant_id → length/total_weight/swing_weight)
  if (action === "upsert_config") {
    const { head_id, shaft_variant_id, length, total_weight, swing_weight } = body;
    const configFields = {
      length: length ?? null,
      total_weight: total_weight ?? null,
      swing_weight: swing_weight || null,
    };

    // Check existing
    const { data: existing } = await admin
      .from("clubs")
      .select("id")
      .eq("head_id", head_id)
      .eq("shaft_variant_id", shaft_variant_id)
      .maybeSingle();

    if (existing) {
      await admin.from("clubs").update(configFields).eq("id", existing.id);
    } else {
      await admin.from("clubs").insert({ head_id, shaft_variant_id, ...configFields });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
