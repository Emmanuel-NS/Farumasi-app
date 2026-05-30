import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.unsplash.com" },
      { protocol: "https", hostname: "**.placeholder.com" },
    ],
  },
};

export default nextConfig;
