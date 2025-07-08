import { routing, isValidLocale } from '@/i18n/routing';
import { generateManifest } from '@/lib/manifest';

interface ManifestLinkProps {
  locale: string;
}

export default async function ManifestLink({ locale }: ManifestLinkProps) {
  // Validate locale
  const validLocale = isValidLocale(locale) 
    ? locale 
    : routing.defaultLocale;

  const manifestUrl = `/api/manifest?locale=${validLocale}`;

  return (
    <link
      rel="manifest"
      href={manifestUrl}
      crossOrigin="use-credentials"
    />
  );
}

// Alternative: Pre-generate manifest data for better performance
export async function generateManifestPreload(locale: string) {
  const manifestData = await generateManifest(locale);
  
  return (
    <script
      type="application/json"
      id="manifest-preload"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(manifestData)
      }}
    />
  );
}
