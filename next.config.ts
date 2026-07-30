import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // Path-based proxy (/api/img/<base64url>) — no query string.
    // search: '' = only URLs without query strings (Next 16 default intent).
    localPatterns: [
      {
        pathname: "/api/img/**",
        search: "",
      },
    ],
    // Cut Vercel Image Optimization transform churn (unique src×w×q×format).
    // Deal art is stable for weeks; keep one format + quality and sizes we render.
    minimumCacheTTL: 2678400, // 31 days
    formats: ["image/webp"],
    qualities: [75],
    // Fixed thumbs/cards (DealImage sizes="40px"|"96px"|"160px", ~25vw cards).
    imageSizes: [40, 96, 160, 320],
    // Viewport heroes / grids; drop 1920+ billboard widths we never need.
    deviceSizes: [640, 750, 1080, 1280],
  },
  async redirects() {
    return [
      { source: "/status", destination: "/admin/status", permanent: false },
      { source: "/stores", destination: "/admin/stores", permanent: false },
    ];
  },
};

export default nextConfig;
