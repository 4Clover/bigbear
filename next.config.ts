import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // For production, configure specific remotePatterns for your image sources:
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: 'your-cdn.com',
    //     pathname: '/images/**',
    //   },
    // ],
    // Using unoptimized for dynamic gallery images from database
    // Remove this and configure remotePatterns for production optimization
    unoptimized: true,
  },
};

export default nextConfig;
