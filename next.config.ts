import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from '@ducanh2912/next-pwa';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
  fallbacks: {
    document: '/offline',
  },
});

const nextConfig: NextConfig = {
  // Enable standalone output for better Docker performance
  output: 'standalone',
  // Image configuration to allow external images
  images: {
    remotePatterns: [
      // Mythoria site images
      {
        protocol: 'https',
        hostname: 'mythoria.pt',
        pathname: '/**',
      },
      // Google Cloud Storage bucket for generated stories
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/mythoria-generated-stories/**',
      },
    ],
  },
  
  // Other existing configurations...
  experimental: {
    // Enable optimizations - expanded for better tree shaking
    optimizePackageImports: [
      '@clerk/nextjs', 
      'next-intl',
      'react-icons',
      '@google-cloud/vertexai',
      'daisyui',
      'drizzle-orm',
      'react-type-animation'
    ],
  },
  // Keep webpack config minimal; avoid overriding Next.js optimization to prevent chunk/runtime issues
  webpack: (config) => {
    // Safe aliasing that doesn't interfere with chunking
    config.resolve.alias = {
      ...config.resolve.alias,
      '@google-cloud/vertexai$': '@google-cloud/vertexai/build/src/index.js',
    };
    return config;
  },
};

export default withPWA(withNextIntl(nextConfig));
