import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "thread-stream"],
  experimental: {
    // Reduces webpack memory footprint when not using Turbopack.
    webpackMemoryOptimizations: true,
    // Caches HMR fetch responses across hot reloads — faster dev, fewer DB round-trips.
    serverComponentsHmrCache: true,
  },
};

export default nextConfig;
