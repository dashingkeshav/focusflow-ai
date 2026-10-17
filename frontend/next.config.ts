import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  devIndicators: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
    if (backendUrl) {
      return [
        {
          source: '/api/:path*',
          destination: `${backendUrl.replace(/\/+$/, '')}/api/:path*`,
        },
      ];
    }

    // In local development without NEXT_PUBLIC_API_URL, fallback to local backend port
    if (process.env.NODE_ENV !== 'production') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:5001/api/:path*',
        },
      ];
    }

    return [];
  },
};

export default nextConfig;

