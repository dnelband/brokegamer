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
  },
  async redirects() {
    return [
      { source: "/status", destination: "/admin/status", permanent: false },
      { source: "/stores", destination: "/admin/stores", permanent: false },
    ];
  },
};

export default nextConfig;
