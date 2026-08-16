import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    return [
      { source: "/status", destination: "/admin/status", permanent: false },
      { source: "/stores", destination: "/admin/stores", permanent: false },
    ];
  },
};

export default nextConfig;
