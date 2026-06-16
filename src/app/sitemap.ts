import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://waggly.jp";

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/help`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/help/account-linking`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/help/plans`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/help/ads`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/help/golfer-card`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, changeFrequency: "monthly", priority: 0.2 },
  ];
}
