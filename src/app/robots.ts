import type { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/portaldegestao/', '/.well-known/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
