import type { NextConfig } from "next";

// Security headers for production
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://etoro-cdn.etorostatic.com https://ui-avatars.com data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://www.etoro.com",
      "frame-src 'self' https://weirdapps.github.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  typescript: {
    // All TypeScript errors are fixed - strict mode enabled
    ignoreBuildErrors: false,
  },
  // Silence Turbopack warning for Next.js 16+
  turbopack: {},
  // Add security headers to all responses
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
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