import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Types ---

export type CatalogModel = {
  id: string;
  name: string;
  maker: string;
  maker_slug: string;
  slug: string;
  category: string;
  description: string | null;
  head_material: string | null;
  head_finish: string | null;
  price: number | null;
  price_min: number | null;
  price_max: number | null;
  release_year: number | null;
  release_month: number | null;
  shaft_names: string[] | null;
  head_manufacture: string | null;
  sle_rule: boolean | null;
  source_url: string | null;
  image_url: string | null;
  alpen_pid: string | null;
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
  catalog_specs: CatalogSpec[];
};

// --- Queries ---

/** 全メーカー一覧（ユニークなmaker/maker_slug） */
export async function getMakers() {
  const { data } = await supabase
    .from("catalog_models")
    .select("maker, maker_slug");
  if (!data) return [];
  const map = new Map<string, { maker: string; maker_slug: string }>();
  for (const d of data) {
    if (!map.has(d.maker_slug)) {
      map.set(d.maker_slug, { maker: d.maker, maker_slug: d.maker_slug });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.maker.localeCompare(b.maker, "ja")
  );
}

/** メーカー内モデル一覧 */
export async function getModelsByMaker(makerSlug: string) {
  const { data } = await supabase
    .from("catalog_models")
    .select("*")
    .eq("maker_slug", makerSlug)
    .order("category")
    .order("name");
  return (data ?? []) as CatalogModel[];
}

/** モデル詳細 + スペック */
export async function getModelDetail(makerSlug: string, slug: string) {
  const { data } = await supabase
    .from("catalog_models")
    .select("*, catalog_specs(*)")
    .eq("maker_slug", makerSlug)
    .eq("slug", slug)
    .order("sort_order", { referencedTable: "catalog_specs" })
    .single();
  return data as CatalogModelWithSpecs | null;
}

/** 全モデル一覧（検索用、ページネーション対応） */
export async function getAllModels() {
  const all: CatalogModel[] = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await supabase
      .from("catalog_models")
      .select("*")
      .order("name")
      .range(offset, offset + pageSize - 1);
    if (!data || data.length === 0) break;
    all.push(...(data as CatalogModel[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

/** カテゴリ内の全モデル一覧（比較インデックス用） */
export async function getModelsByCategory(category: string) {
  const { data } = await supabase
    .from("catalog_models")
    .select("*")
    .eq("category", category)
    .order("name");
  return (data ?? []) as CatalogModel[];
}

/** 比較用slugからモデル取得 */
async function getModelByCompareSlug(compareSlug: string, category: string) {
  // compareSlug = "ping-g430-iron" → maker_slug=ping, slug=g430-iron (2-stage approach)
  // Stage 1: lightweight fetch to find the matching model by id+maker_slug+slug
  const { data: lightModels } = await supabase
    .from("catalog_models")
    .select("id, maker_slug, slug")
    .eq("category", category);

  if (!lightModels) return null;

  const match = lightModels.find(
    (m) => compareModelSlug(m as Pick<CatalogModel, "maker_slug" | "slug">) === compareSlug
  );
  if (!match) return null;

  // Stage 2: fetch full model with specs for the matched id only
  const { data } = await supabase
    .from("catalog_models")
    .select("*, catalog_specs(*)")
    .eq("id", match.id)
    .order("sort_order", { referencedTable: "catalog_specs" })
    .single();

  return data as CatalogModelWithSpecs | null;
}

/** slugから2モデル取得（VS比較用） */
export async function getCompareModels(category: string, slugA: string, slugB: string) {
  const [modelA, modelB] = await Promise.all([
    getModelByCompareSlug(slugA, category),
    getModelByCompareSlug(slugB, category),
  ]);
  return { modelA, modelB };
}

/** モデルの比較用slug生成（{maker_slug}-{model_slug}） */
export function compareModelSlug(model: Pick<CatalogModel, "maker_slug" | "slug">): string {
  return `${model.maker_slug}-${model.slug}`;
}
