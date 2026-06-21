import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const maker = searchParams.get("maker")?.trim();
  const model = searchParams.get("model")?.trim();

  if (!category && !maker && !model) {
    return NextResponse.json([]);
  }

  // maker can be Japanese (ヤマハ) or English (YAMAHA) — search both maker and maker_slug
  if (maker) {
    const makerLower = maker.toLowerCase().replace(/\s+/g, "-");
    // Try maker_slug exact-ish match first, then fall back to maker ilike
    const baseSelect = "id, name, maker, maker_slug, slug, category, release_year, shaft_names, catalog_specs(*)";

    const { data: slugData } = await supabase
      .from("catalog_models")
      .select(baseSelect)
      .eq("is_visible", true)
      .ilike("maker_slug", `%${makerLower}%`)
      .order("sort_order", { referencedTable: "catalog_specs" })
      .limit(20);

    const { data: nameData } = await supabase
      .from("catalog_models")
      .select(baseSelect)
      .eq("is_visible", true)
      .ilike("maker", `%${maker}%`)
      .order("sort_order", { referencedTable: "catalog_specs" })
      .limit(20);

    // Merge, dedupe by id
    const merged = new Map<string, (typeof slugData extends (infer T)[] | null ? T : never)>();
    for (const item of [...(slugData ?? []), ...(nameData ?? [])]) {
      if (!merged.has(item.id)) merged.set(item.id, item);
    }
    let results = Array.from(merged.values());

    // Apply additional filters
    if (category) results = results.filter((r) => r.category === category);
    if (model) {
      const words = model.toLowerCase().split(/\s+/).filter(Boolean);
      results = results.filter((r) => {
        const name = r.name.toLowerCase();
        return words.every((w) => name.includes(w));
      });
    }

    return NextResponse.json(results.slice(0, 20));
  }

  let query = supabase
    .from("catalog_models")
    .select("id, name, maker, maker_slug, slug, category, release_year, shaft_names, catalog_specs(*)")
    .eq("is_visible", true)
    .order("sort_order", { referencedTable: "catalog_specs" })
    .limit(20);

  if (category) query = query.eq("category", category);
  if (model) query = query.ilike("name", `%${model}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
