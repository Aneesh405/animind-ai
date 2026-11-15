import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the development badge from covering the experiment's mobile controls.
  devIndicators: false,
  // Both documented loopback URLs must hydrate and connect to development HMR.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
