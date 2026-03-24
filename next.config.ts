import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer'],
  images: { unoptimized: true },
};

export default nextConfig;
