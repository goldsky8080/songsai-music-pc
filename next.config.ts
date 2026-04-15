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
        source: "/albums-store.html",
        destination: "/assets",
        permanent: true,
      },
      {
        source: "/albums.html",
        destination: "/assets",
        permanent: true,
      },
      {
        source: "/contact",
        destination: "/support",
        permanent: true,
      },
      {
        source: "/contact.html",
        destination: "/support",
        permanent: true,
      },
      {
        source: "/event",
        destination: "/pricing",
        permanent: true,
      },
      {
        source: "/event.html",
        destination: "/pricing",
        permanent: true,
      },
      {
        source: "/index.html",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
