import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Optimize build by excluding large data files from processing
  webpack: (config, { isServer }) => {
    // Ignore large JSON data files during build
    config.module.rules.push({
      test: /public\/data\/.*\.json$/,
      use: 'ignore-loader',
    });
    return config;
  },
  // Exclude data directory from static file optimization
  outputFileTracingExcludes: {
    '*': ['public/data/**/*'],
  },
};

export default nextConfig;