import type { MetadataRoute } from "next";
import { getMakers, getAllModels } from "@/lib/catalog";

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
    { url: `${baseUrl}/catalog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/compare`, changeFrequency: "weekly", priority: 0.8 },
  ];

  // --- Catalog pages (single query) ---
  const catalogUrls: MetadataRoute.Sitemap = [];

  try {
    const [makers, allModels] = await Promise.all([getMakers(), getAllModels()]);

    // Maker pages
    for (const maker of makers) {
      catalogUrls.push({
        url: `${baseUrl}/catalog/${maker.slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    // Model detail pages
    for (const model of allModels) {
      catalogUrls.push({
        url: `${baseUrl}/catalog/${model.maker_slug}/${model.slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    // If catalog data is unavailable, skip silently
  }

  // --- Compare category pages ---
  const compareUrls: MetadataRoute.Sitemap = ALL_CATEGORIES.map((category) => ({
    url: `${baseUrl}/compare/${category}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // --- News pages ---
  const newsUrls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/news`, changeFrequency: "daily" as const, priority: 0.7 },
    ...ALL_CATEGORIES.map((category) => ({
      url: `${baseUrl}/news/${category}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];

  return [...staticUrls, ...catalogUrls, ...compareUrls, ...newsUrls];
}
