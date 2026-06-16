import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/help/", "/terms", "/privacy"],
        disallow: [
          "/p/",
          "/bag/",
          "/items/",
          "/practice/",
          "/coach/",
          "/courses/",
          "/settings/",
          "/onboarding",
          "/report/",
          "/api/",
          "/auth/",
        ],
      },
    ],
    sitemap: "https://waggly.jp/sitemap.xml",
  };
}
