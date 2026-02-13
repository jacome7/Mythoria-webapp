import type { NextConfig } from 'next';
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
    // Ensure offline route is always precached (avoids bad-precaching-response if auto detection fails)
    additionalManifestEntries: [
      { url: '/offline', revision: process.env.npm_package_version || '1' },
    ],
  },
  fallbacks: {
    document: '/offline',
  },
});

const nextConfig: NextConfig = {
  // Enable standalone output for better Docker performance
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/apple-touch-icon-precomposed.png',
        destination: '/apple-touch-icon.png',
        permanent: true,
      },
    ];
  },
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
      // Google Cloud Storage bucket for public assets
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/mythoria-public/**',
      },
      // ElevenLabs CDN
      {
        protocol: 'https',
        hostname: 'eleven-public-cdn.elevenlabs.io',
        pathname: '/**',
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
      'daisyui',
      'drizzle-orm',
      'react-type-animation',
    ],
  },
  // Keep webpack config minimal; avoid overriding Next.js optimization to prevent chunk/runtime issues
  webpack: (config) => {
    // Keep aliasing minimal; no VertexAI alias required anymore
    config.resolve.alias = {
      ...config.resolve.alias,
      // Force using userland punycode implementation instead of deprecated Node builtin
      punycode: require.resolve('punycode/'),
    };
    // Note: Node's internal loader may emit DEP0040 before webpack aliasing takes effect
    // during Next build (some Next scripts reference the builtin early). This alias prevents
    // your application code from pulling the deprecated builtin at runtime, but cannot fully
    // silence early bootstrap warnings in Node 22.
    return config;
  },
};

export default withPWA(withNextIntl(nextConfig));
