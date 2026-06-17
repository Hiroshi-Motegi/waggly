import type { MetadataRoute } from "next";
import { getMakers, getSeriesByMaker, getModelsByCategory } from "@/lib/catalog";
import { modelSlug } from "@/lib/catalog";

const baseUrl = "https://waggly.jp";

const ALL_CATEGORIES = [
  "driver",
  "fairway_wood",
  "utility",
  "iron",
  "wedge",
  "putter",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/help`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/help/account-linking`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/help/plans`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/help/ads`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/help/golfer-card`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, changeFrequency: "monthly", priority: 0.2 },
  ];

  // --- Catalog pages ---

  const catalogUrls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/catalog`, changeFrequency: "weekly", priority: 0.8 },
  ];

  try {
    const makers = await getMakers();

    for (const maker of makers) {
      catalogUrls.push({
        url: `${baseUrl}/catalog/${maker.maker_slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });

      const seriesList = await getSeriesByMaker(maker.maker_slug);
      for (const series of seriesList) {
        catalogUrls.push({
          url: `${baseUrl}/catalog/${series.maker_slug}/${series.name_slug}`,
          changeFrequency: "weekly",
          priority: 0.7,
        });

        // We need model detail pages — fetched via getModelsBySeries
        // but catalog.ts exposes getModelsBySeries, so let's use it inline
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: models } = await supabase
          .from("catalog_models")
          .select("category_slug")
          .eq("series_id", series.id);

        for (const model of models ?? []) {
          catalogUrls.push({
            url: `${baseUrl}/catalog/${series.maker_slug}/${series.name_slug}/${model.category_slug}`,
            changeFrequency: "monthly",
            priority: 0.6,
          });
        }
      }
    }
  } catch {
    // If catalog data is unavailable, skip silently
  }

  // --- Compare pages ---

  const compareUrls: MetadataRoute.Sitemap = [];

  try {
    for (const category of ALL_CATEGORIES) {
      compareUrls.push({
        url: `${baseUrl}/compare/${category}`,
        changeFrequency: "weekly",
        priority: 0.6,
      });

      const models = await getModelsByCategory(category);

      for (let i = 0; i < models.length; i++) {
        for (let j = i + 1; j < models.length; j++) {
          const slugA = modelSlug(models[i].catalog_series);
          const slugB = modelSlug(models[j].catalog_series);
          const [sortedA, sortedB] = [slugA, slugB].sort();
          compareUrls.push({
            url: `${baseUrl}/compare/${category}/${sortedA}-vs-${sortedB}`,
            changeFrequency: "monthly",
            priority: 0.5,
          });
        }
      }
    }
  } catch {
    // If compare data is unavailable, skip silently
  }

  return [...staticUrls, ...catalogUrls, ...compareUrls];
}
