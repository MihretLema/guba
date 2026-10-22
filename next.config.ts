import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext applies the multipart action limit before routing image uploads.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
};

export default nextConfig;
