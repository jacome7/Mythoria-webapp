import type { MetadataRoute } from 'next';
import { BASE_URL, getPrivateCrawlerDisallowPaths } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: getPrivateCrawlerDisallowPaths(),
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
