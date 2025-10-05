import { NextRequest, NextResponse } from 'next/server';
import { routing, isValidLocale } from '@/i18n/routing';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale');

  // Validate locale or use default
  const validLocale = locale && isValidLocale(locale) ? locale : routing.defaultLocale;

  try {
    // Import the metadata for the requested locale
    const metadata = await import(`@/messages/${validLocale}/Metadata.json`);

    // Base manifest configuration
    const baseManifest = {
      start_url: `/${validLocale}`,
      display: 'standalone',
      orientation: 'portrait-primary',
      theme_color: '#014a70',
      background_color: '#FFFFFF',
      lang: validLocale,
      scope: '/',
      icons: [
        {
          src: '/favicon.ico',
          sizes: '64x64 32x32 24x24 16x16',
          type: 'image/x-icon',
        },
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable any',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable any',
        },
      ],
      categories: ['entertainment', 'books', 'education'],
    };

    // Merge with localized content
    const localizedManifest = {
      ...baseManifest,
      name: metadata.Metadata.manifest.name,
      short_name: metadata.Metadata.manifest.short_name,
      description: metadata.Metadata.manifest.description,
      shortcuts: [
        {
          name: metadata.Metadata.manifest.shortcuts.createStory.name,
          short_name: metadata.Metadata.manifest.shortcuts.createStory.short_name,
          description: metadata.Metadata.manifest.shortcuts.createStory.description,
          url: `/${validLocale}`,
          icons: [{ src: '/favicon.ico', sizes: '64x64' }],
        },
      ],
    };

    return NextResponse.json(localizedManifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating manifest:', error);

    // Fallback to default manifest
    const fallbackManifest = {
      name: 'Mythoria - Personalized Books Creator',
      short_name: 'Mythoria',
      description: 'Create unique, fully illustrated books',
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      theme_color: '#014a70',
      background_color: '#FFFFFF',
      lang: 'en',
      scope: '/',
      icons: [
        {
          src: '/favicon.ico',
          sizes: '64x64 32x32 24x24 16x16',
          type: 'image/x-icon',
        },
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable any',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable any',
        },
      ],
      categories: ['entertainment', 'books', 'education'],
      shortcuts: [
        {
          name: 'Create Story',
          short_name: 'Create',
          description: 'Start creating a new story',
          url: '/',
          icons: [{ src: '/favicon.ico', sizes: '64x64' }],
        },
      ],
    };

    return NextResponse.json(fallbackManifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
      },
    });
  }
}
