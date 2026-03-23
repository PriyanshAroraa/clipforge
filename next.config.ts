import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'puppeteer'],
  images: { unoptimized: true },
};

export default nextConfig;
