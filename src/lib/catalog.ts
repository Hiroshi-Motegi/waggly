import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: SupabaseClient<any> = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Types ---

export type CatalogMaker = {
  id: string;
  slug: string;
  name: string;
  name_ja: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type CatalogModel = {
  maker_id: string;
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
  sle_rule: string | null;
  source_url: string | null;
  image_url: string | null;
  alpen_pid: string | null;
  is_visible: boolean;
  spec_updated_at: string | null;
};

export type CatalogSpec = {
  id: string;
  model_id: string;
  club_number: string;
  shaft_name: string | null;
  shaft_flex: string | null;
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

export type CatalogModelImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

export type CatalogModelLink = {
  id: string;
  label: string;
  url: string;
  sort_order: number;
};

export type CatalogModelAttribute = {
  id: string;
  label: string;
  value: string;
  sort_order: number;
};

export type CatalogGrip = {
  id: string;
  grip_name: string;
  maker: string | null;
  grip_size: string | null;
  weight: number | null;
  material: string | null;
  image_url: string | null;
};

export type CatalogShaft = {
  id: string;
  shaft_name: string;
  maker: string | null;
  shaft_type: string | null;
  flex: string | null;
  shaft_weight: number | null;
  torque: number | null;
  kick_point: string | null;
};

export type CatalogModelWithSpecs = CatalogModel & {
  catalog_specs: CatalogSpec[];
  catalog_model_images: CatalogModelImage[];
  catalog_model_links: CatalogModelLink[];
  catalog_model_attributes: CatalogModelAttribute[];
  linked_shafts: CatalogShaft[];
  linked_grips: CatalogGrip[];
};

// --- Queries ---

/** 全メーカー一覧 */
export async function getMakers() {
  const { data } = await supabase
    .from("catalog_makers")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order")
    .order("name");
  return (data ?? []) as CatalogMaker[];
}

/** メーカー取得（slug指定） */
export async function getMakerBySlug(makerSlug: string) {
  const { data } = await supabase
    .from("catalog_makers")
    .select("*")
    .eq("slug", makerSlug)
    .eq("is_visible", true)
    .single();
  return data as CatalogMaker | null;
}

/** メーカー内モデル一覧（メーカー非表示なら空） */
export async function getModelsByMaker(makerSlug: string) {
  const maker = await getMakerBySlug(makerSlug);
  if (!maker) return [];

  const { data } = await supabase
    .from("catalog_models")
    .select("*, catalog_model_images(image_url, sort_order)")
    .eq("maker_id", maker.id)
    .eq("is_visible", true)
    .order("category")
    .order("name")
    .order("sort_order", { referencedTable: "catalog_model_images" });
  return (data ?? []) as CatalogModel[];
}

/** モデル詳細 + スペック */
export async function getModelDetail(makerSlug: string, slug: string) {
  const { data, error } = await supabase
    .from("catalog_models")
    .select("*, catalog_specs(*), catalog_model_images(*), catalog_model_links(*), catalog_model_attributes(*)")
    .eq("maker_slug", makerSlug)
    .eq("slug", slug)
    .eq("is_visible", true)
    .order("sort_order", { referencedTable: "catalog_specs" })
    .order("sort_order", { referencedTable: "catalog_model_images" })
    .order("sort_order", { referencedTable: "catalog_model_links" })
    .order("sort_order", { referencedTable: "catalog_model_attributes" })
    .single();
  if (error) { console.error("getModelDetail error:", error); return null; }
  if (!data) return null;

  // Fetch linked shafts from shaft_names array
  const shaftNames: string[] = data.shaft_names ?? [];
  let linkedShafts: CatalogShaft[] = [];
  if (shaftNames.length > 0) {
    const { data: shafts } = await supabase
      .from("catalog_shafts")
      .select("*")
      .in("shaft_name", shaftNames)
      .order("sort_order");
    linkedShafts = (shafts ?? []) as CatalogShaft[];
  }

  // Fetch linked grips from __grip_names__ attribute
  const { deserializeGripNames: parseGripNames } = await import("@/lib/grip-utils");
  const gripNamesList = parseGripNames(data.catalog_model_attributes ?? []);
  let linkedGrips: CatalogGrip[] = [];
  if (gripNamesList.length > 0) {
    const { data: gripsData } = await supabase
      .from("catalog_grips")
      .select("*")
      .in("grip_name", gripNamesList)
      .order("sort_order");
    linkedGrips = (gripsData ?? []) as CatalogGrip[];
  }

  return {
    ...data,
    linked_shafts: linkedShafts,
    linked_grips: linkedGrips,
  } as CatalogModelWithSpecs;
}

/** モデルに紐づくシャフト情報を取得 */
export async function getShaftsForModel(shaftNames: string[]): Promise<CatalogShaft[]> {
  if (shaftNames.length === 0) return [];
  const { data } = await supabase
    .from("catalog_shafts")
    .select("id, shaft_name, maker, shaft_type, flex, shaft_weight, torque, kick_point")
    .in("shaft_name", shaftNames)
    .eq("is_visible", true)
    .order("sort_order");
  return (data ?? []) as CatalogShaft[];
}

/** モデル検索（DB側フィルタ） */
export async function searchModels(query: string): Promise<CatalogModel[]> {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  // Build query: each token must match name OR maker
  let q = supabase
    .from("catalog_models")
    .select("*")
    .eq("is_visible", true);

  for (const token of tokens) {
    q = q.or(`name.ilike.%${token}%,maker.ilike.%${token}%,maker_slug.ilike.%${token}%`);
  }

  const { data } = await q.order("maker").order("name").limit(200);

  // Client-side AND filter (DB or() is OR per token, we need AND across tokens)
  const results = (data ?? []).filter((m) => {
    const text = `${m.maker} ${m.maker_slug} ${m.name}`.toLowerCase();
    return tokens.every((t) => text.includes(t));
  });

  return results as CatalogModel[];
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
      .eq("is_visible", true)
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
    .select("*, catalog_makers!inner(is_visible)")
    .eq("category", category)
    .eq("is_visible", true)
    .eq("catalog_makers.is_visible", true)
    .order("name");
  return (data ?? []) as CatalogModel[];
}

/** 比較用slugからモデル取得 */
async function getModelByCompareSlug(compareSlug: string, category: string) {
  // compareSlug = "ping-g430-iron" → maker_slug=ping, slug=g430-iron (2-stage approach)
  // Stage 1: lightweight fetch to find the matching model by id+maker_slug+slug
  const { data: lightModels } = await supabase
    .from("catalog_models")
    .select("id, maker_slug, slug, catalog_makers!inner(is_visible)")
    .eq("category", category)
    .eq("is_visible", true)
    .eq("catalog_makers.is_visible", true);

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
