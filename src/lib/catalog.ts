import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Types ---

export type CatalogSeries = {
  id: string;
  maker: string;
  name: string;
  maker_slug: string;
  name_slug: string;
  image_url: string | null;
};

export type CatalogModel = {
  id: string;
  series_id: string;
  name: string;
  category: string;
  slug: string;
  head_material: string | null;
  finish: string | null;
  price: number | null;
  price_note: string | null;
  release_year: number | null;
  shaft_names: string[] | null;
  grip_name: string | null;
  url: string | null;
  image_url: string | null;
};

export type CatalogSpec = {
  id: string;
  model_id: string;
  club_number: string;
  loft: number | null;
  lie: number | null;
  bounce: number | null;
  length: number | null;
  weight: number | null;
  swing_weight: string | null;
  head_volume: number | null;
  head_weight: number | null;
  face_angle: number | null;
  sort_order: number;
};

export type CatalogModelWithSpecs = CatalogModel & {
  catalog_series: CatalogSeries;
  catalog_specs: CatalogSpec[];
};

// --- Queries ---

/** 全メーカー一覧（ユニークなmaker/maker_slug） */
export async function getMakers() {
  const { data } = await supabase
    .from("catalog_series")
    .select("maker, maker_slug")
    .order("maker");
  if (!data) return [];
  const seen = new Set<string>();
  return data.filter((d) => {
    if (seen.has(d.maker_slug)) return false;
    seen.add(d.maker_slug);
    return true;
  });
}

/** メーカー内シリーズ一覧 */
export async function getSeriesByMaker(makerSlug: string) {
  const { data } = await supabase
    .from("catalog_series")
    .select("*")
    .eq("maker_slug", makerSlug)
    .order("name");
  return data ?? [];
}

/** シリーズ内モデル一覧 */
export async function getModelsBySeries(makerSlug: string, nameSlug: string) {
  const { data } = await supabase
    .from("catalog_models")
    .select("*, catalog_series!inner(*)")
    .eq("catalog_series.maker_slug", makerSlug)
    .eq("catalog_series.name_slug", nameSlug)
    .order("category");
  return (data ?? []) as (CatalogModel & { catalog_series: CatalogSeries })[];
}

/** モデル詳細 + スペック */
export async function getModelDetail(makerSlug: string, nameSlug: string, slug: string) {
  const { data } = await supabase
    .from("catalog_models")
    .select("*, catalog_series!inner(*), catalog_specs(*)")
    .eq("catalog_series.maker_slug", makerSlug)
    .eq("catalog_series.name_slug", nameSlug)
    .eq("slug", slug)
    .order("sort_order", { referencedTable: "catalog_specs" })
    .single();
  return data as CatalogModelWithSpecs | null;
}

/** カテゴリ内の全モデル一覧（比較インデックス用） */
export async function getModelsByCategory(category: string) {
  const { data } = await supabase
    .from("catalog_models")
    .select("*, catalog_series!inner(*)")
    .eq("category", category)
    .order("name");
  return (data ?? []) as (CatalogModel & { catalog_series: CatalogSeries })[];
}

/** 比較用slugからモデル取得 */
async function getModelByCompareSlug(compareSlug: string, category: string) {
  // compareSlug = "ping-g430-iron" → maker_slug=ping, name_slug=g430, slug=iron
  // 先頭からmaker_slug, name_slugを順に試す
  const { data: allModels } = await supabase
    .from("catalog_models")
    .select("*, catalog_series!inner(*), catalog_specs(*)")
    .eq("category", category)
    .order("sort_order", { referencedTable: "catalog_specs" });

  if (!allModels) return null;
  return (allModels as CatalogModelWithSpecs[]).find((m) => {
    const s = m.catalog_series as CatalogSeries;
    return compareModelSlug(s, m) === compareSlug;
  }) ?? null;
}

/** slugから2モデル取得（VS比較用） */
export async function getCompareModels(category: string, slugA: string, slugB: string) {
  const [modelA, modelB] = await Promise.all([
    getModelByCompareSlug(slugA, category),
    getModelByCompareSlug(slugB, category),
  ]);
  return { modelA, modelB };
}

/** モデルの比較用slug生成（{maker_slug}-{name_slug}-{model_slug}） */
export function compareModelSlug(series: CatalogSeries, model: CatalogModel): string {
  return `${series.maker_slug}-${series.name_slug}-${model.slug}`;
}
