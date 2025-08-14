import { routing, isValidLocale } from '@/i18n/routing';

export interface ManifestData {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  orientation: string;
  theme_color: string;
  background_color: string;
  lang: string;
  scope: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  categories: string[];
  shortcuts: Array<{
    name: string;
    short_name: string;
    description: string;
    url: string;
    icons: Array<{
      src: string;
      sizes: string;
    }>;
  }>;
}

export async function generateManifest(locale: string): Promise<ManifestData> {
  // Validate locale or use default
  const validLocale = isValidLocale(locale) 
    ? locale 
    : routing.defaultLocale;

  try {
    // Import the metadata for the requested locale
    const metadata = await import(`@/messages/${validLocale}/Metadata.json`);
    
    return {
      name: metadata.Metadata.manifest.name,
      short_name: metadata.Metadata.manifest.short_name,
      description: metadata.Metadata.manifest.description,
      start_url: `/${validLocale}`,
      display: "standalone",
      orientation: "portrait-primary",
      theme_color: "#014a70",
      background_color: "#FFFFFF",
      lang: validLocale,
      scope: "/",
      icons: [
        {
          src: "/favicon.ico",
          sizes: "64x64 32x32 24x24 16x16",
          type: "image/x-icon"
        },
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable any"
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable any"
        }
      ],
      categories: ["entertainment", "books", "education"],
      shortcuts: [
        {
          name: metadata.Metadata.manifest.shortcuts.createStory.name,
          short_name: metadata.Metadata.manifest.shortcuts.createStory.short_name,
          description: metadata.Metadata.manifest.shortcuts.createStory.description,
          url: `/${validLocale}`,
          icons: [{ src: "/favicon.ico", sizes: "64x64" }]
        }
      ]
    };
  } catch (error) {
    console.error('Error generating manifest for locale:', validLocale, error);
    
    // Fallback to default manifest
    return {
      name: "Mythoria - Personalized Books Creator",
      short_name: "Mythoria",
      description: "Create unique, fully illustrated books",
      start_url: "/",
      display: "standalone",
      orientation: "portrait-primary",
      theme_color: "#014a70",
      background_color: "#FFFFFF",
      lang: "en",
      scope: "/",
      icons: [
        {
          src: "/favicon.ico",
          sizes: "64x64 32x32 24x24 16x16",
          type: "image/x-icon"
        },
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable any"
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable any"
        }
      ],
      categories: ["entertainment", "books", "education"],
      shortcuts: [
        {
          name: "Create Story",
          short_name: "Create",
          description: "Start creating a new story",
          url: "/",
          icons: [{ src: "/favicon.ico", sizes: "64x64" }]
        }
      ]
    };
  }
}

export function getManifestUrl(locale: string): string {
  return `/api/manifest?locale=${locale}`;
}
