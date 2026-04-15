import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  typedRoutes: true,
  async redirects() {
    return [
      {
        source: "/albums",
        destination: "/assets",
        permanent: true,
      },
      {
        source: "/contact",
        destination: "/support",
        permanent: true,
      },
      {
        source: "/event",
        destination: "/pricing",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
