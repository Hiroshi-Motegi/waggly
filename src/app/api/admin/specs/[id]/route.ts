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
    .from("club_spec_heads")
    .select("*, series:club_spec_series(*), configurations:club_spec_configurations(length, total_weight, swing_weight, shaft_id)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Flatten default configuration (shaft_id === null)
  const defaultCfg = (data.configurations ?? []).find((c: any) => c.shaft_id === null);
  const { configurations, ...rest } = data;
  return NextResponse.json({
    ...rest,
    length: defaultCfg?.length ?? null,
    total_weight: defaultCfg?.total_weight ?? null,
    swing_weight: defaultCfg?.swing_weight ?? null,
  });
}
