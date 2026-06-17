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
    .from("club_spec_series")
    .select(`
      *,
      club_spec_heads(id, category, club_number, sort_order, loft, lie, head_volume, head_weight, distance, verified,
        configurations:club_spec_configurations(id, shaft_id, length, total_weight, swing_weight)
      ),
      series_shafts:club_spec_series_shafts(id, is_default, shaft:shafts(id, maker, name, flex, weight))
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build specs with all configurations (not just default)
  const specs = (data.club_spec_heads ?? [])
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
    .map((ss: any) => ({ link_id: ss.id, is_default: ss.is_default, ...ss.shaft }))
    .sort((a: any, b: any) => `${a.maker} ${a.name}`.localeCompare(`${b.maker} ${b.name}`));

  return NextResponse.json({
    ...data,
    specs,
    spec_count: specs.length,
    shafts,
    club_spec_heads: undefined,
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
    const { shaft_id, is_default } = body;
    const { data, error } = await admin
      .from("club_spec_series_shafts")
      .insert({ series_id: seriesId, shaft_id, is_default: is_default ?? false })
      .select("id, is_default, shaft:shafts(id, maker, name, flex, weight)")
      .single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "既に追加済みです" }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ link_id: data.id, is_default: data.is_default, ...(data as any).shaft });
  }

  // Remove shaft from series
  if (action === "remove_shaft") {
    const { link_id } = body;
    await admin.from("club_spec_series_shafts").delete().eq("id", link_id);
    // Also remove configurations for this shaft under this series' heads
    const { data: heads } = await admin.from("club_spec_heads").select("id").eq("series_id", seriesId);
    if (heads && heads.length > 0) {
      const headIds = heads.map((h: any) => h.id);
      await admin.from("club_spec_configurations").delete()
        .eq("shaft_id", body.shaft_id)
        .in("head_id", headIds);
    }
    return NextResponse.json({ ok: true });
  }

  // Upsert configuration (head_id + shaft_id → length/total_weight/swing_weight)
  if (action === "upsert_config") {
    const { head_id, shaft_id, length, total_weight, swing_weight } = body;
    const configFields = {
      length: length ?? null,
      total_weight: total_weight ?? null,
      swing_weight: swing_weight || null,
    };

    // Check existing
    const { data: existing } = await admin
      .from("club_spec_configurations")
      .select("id")
      .eq("head_id", head_id)
      .eq("shaft_id", shaft_id)
      .maybeSingle();

    if (existing) {
      await admin.from("club_spec_configurations").update(configFields).eq("id", existing.id);
    } else {
      await admin.from("club_spec_configurations").insert({ head_id, shaft_id, ...configFields });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
