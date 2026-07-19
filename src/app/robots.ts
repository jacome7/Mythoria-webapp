import type { MetadataRoute } from 'next';
import { BASE_URL, getTrainingBotDisallowPaths } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const technicalDisallows = ['/api/', '/portaldegestao/', '/.well-known/'];
  const trainingDisallows = getTrainingBotDisallowPaths();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: technicalDisallows,
      },
      ...['GPTBot', 'ClaudeBot', 'Google-Extended'].map((userAgent) => ({
        userAgent,
        allow: ['/', '/pt-PT/lp/', '/pt-PT/blog/'],
        disallow: trainingDisallows,
      })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
