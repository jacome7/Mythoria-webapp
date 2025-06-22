import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Enable standalone output for better Docker performance
  output: 'standalone',
  // Image configuration to allow external images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS hostnames
      },
      {
        protocol: 'http',
        hostname: '**', // Allow all HTTP hostnames (for local development)
      }
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
  },    // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Tree shaking optimizations
      config.resolve.alias = {
        ...config.resolve.alias,
        // Optimize Google Cloud imports
        '@google-cloud/vertexai$': '@google-cloud/vertexai/build/src/index.js',
      };

      // Optimize bundle splitting
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
            maxSize: 244000, // ~240KB chunks
          },
          // Common chunk
          common: {
            minChunks: 2,
            chunks: 'all',
            name: 'common',
            priority: 10,
          },
          // Google Cloud services chunk
          googleCloud: {
            name: 'google-cloud',
            chunks: 'all',
            test: /node_modules\/@google-cloud/,
            priority: 30,
          },
          // React Icons chunk
          reactIcons: {
            name: 'react-icons',
            chunks: 'all',
            test: /node_modules\/react-icons/,
            priority: 25,
          },
        },
      };

      // Enable tree shaking for ES modules
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
