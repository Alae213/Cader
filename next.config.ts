import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },
    ],
  },
  // Disable Turbopack on Windows due to CSS/nul path bug
  // Remove this when Turbopack fixes Windows compatibility
  experimental: {
    // turbopack: false, // Uncomment if needed
  },
};

export default nextConfig;
