import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Required because shared/ lives one level above web/ — Next.js
    // blocks imports from outside its own project root by default.
    externalDir: true,
  },
};

export default nextConfig;
