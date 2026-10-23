import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Database drivers run as plain Node modules (PGlite ships a WASM build of PostgreSQL).
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Car photos are uploaded through admin server actions (up to 15 MB each, several at once).
  experimental: { serverActions: { bodySizeLimit: "60mb" } },
  async headers() {
    // While the site is in private testing, tell search engines not to index it.
    if (process.env.SITE_NOINDEX !== "true") return [];
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
