import type { NextConfig } from "next";

const isAppExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  devIndicators: false,
  ...(isAppExport && {
    output: "export",
    images: { unoptimized: true },
  }),
  ...(!isAppExport && {
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "**.rakuten.co.jp",
        },
        {
          protocol: "https",
          hostname: "**.gora.golf.rakuten.co.jp",
        },
        {
          protocol: "https",
          hostname: "**.supabase.co",
        },
      ],
    },
  }),
};

export default nextConfig;
