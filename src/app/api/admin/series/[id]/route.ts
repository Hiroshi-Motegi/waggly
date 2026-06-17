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
    .select("*, club_specs(id, category, club_number, loft, lie, length, weight, swing_weight, verified)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const specs = (data.club_specs ?? []).sort((a: any, b: any) =>
    (a.club_number ?? "").localeCompare(b.club_number ?? "")
  );

  return NextResponse.json({ ...data, specs, spec_count: specs.length, club_specs: undefined });
}
