import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/help/", "/terms", "/privacy", "/catalog/", "/compare/", "/news/"],
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
      // AI crawlers - block training
      { userAgent: "GPTBot", disallow: ["/"] },
      { userAgent: "ClaudeBot", disallow: ["/"] },
      { userAgent: "CCBot", disallow: ["/"] },
      { userAgent: "Google-Extended", disallow: ["/"] },
      { userAgent: "Bytespider", disallow: ["/"] },
      { userAgent: "Amazonbot", disallow: ["/"] },
      { userAgent: "meta-externalagent", disallow: ["/"] },
      { userAgent: "Applebot-Extended", disallow: ["/"] },
    ],
    sitemap: "https://waggly.jp/sitemap.xml",
  };
}
