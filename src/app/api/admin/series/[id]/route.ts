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
    .select("*, club_spec_heads(id, category, club_number, sort_order, loft, lie, head_volume, head_weight, distance, verified, configurations:club_spec_configurations(length, total_weight, swing_weight, shaft_id))")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Flatten default config into each spec
  const specs = (data.club_spec_heads ?? [])
    .map((sp: any) => {
      const defaultCfg = (sp.configurations ?? []).find((c: any) => c.shaft_id === null);
      const { configurations, ...rest } = sp;
      return {
        ...rest,
        length: defaultCfg?.length ?? null,
        total_weight: defaultCfg?.total_weight ?? null,
        swing_weight: defaultCfg?.swing_weight ?? null,
      };
    })
    .sort((a: any, b: any) => {
      const sa = a.sort_order ?? 9999;
      const sb = b.sort_order ?? 9999;
      if (sa !== sb) return sa - sb;
      return (a.club_number ?? "").localeCompare(b.club_number ?? "");
    });

  return NextResponse.json({ ...data, specs, spec_count: specs.length, club_spec_heads: undefined });
}
