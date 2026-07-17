import { NextResponse } from 'next/server';
import { storyService, blogService } from '@/db/services';
import { getIndexableLandingPages } from '@/content/landing-pages';
import { routing } from '@/i18n/routing';
import { BASE_URL, buildLocalizedUrl, getSeoRoutePolicy, normalizePathname } from '@/lib/seo';
import { validateMdxSource } from '@/lib/blog/mdx-validate';
import { normalizeLocale } from '@/utils/locale-utils';

export const dynamic = 'force-dynamic';

type SitemapAlternate = { hreflang: string; href: string };

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
  alternates?: SitemapAlternate[];
};

const locales = routing.locales as readonly string[];
const STATIC_SITEMAP_SUFFIXES = [
  '',
  '/aboutUs',
  '/contactUs',
  '/faqs',
  '/pricing',
  '/privacy-policy',
  '/termsAndConditions',
  '/tell-your-story',
  '/get-inspired',
  '/blog',
] as const;

export async function GET() {
  const startedAt = Date.now();
  try {
    const sitemap = await generateSitemap();
    console.info(
      JSON.stringify({
        event: 'sitemap.generated',
        durationMs: Date.now() - startedAt,
        urlCount: (sitemap.match(/<url>/g) ?? []).length,
      }),
    );
    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=900',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new NextResponse('Sitemap temporarily unavailable', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'Retry-After': '300',
      },
    });
  }
}

export async function generateSitemap(): Promise<string> {
  const entries = new Map<string, SitemapEntry>();
  const [stories, blogTranslations] = await Promise.all([
    storyService.getFeaturedPublicStories(),
    blogService.getPublishedSitemapTranslations(),
  ]);

  for (const suffix of STATIC_SITEMAP_SUFFIXES) {
    const cluster = locales.map((locale) => ({
      hreflang: locale.toLowerCase(),
      href: buildLocalizedUrl(locale, suffix),
    }));
    if (suffix === '') {
      cluster.push({ hreflang: 'x-default', href: buildLocalizedUrl(routing.defaultLocale) });
    }

    for (const locale of locales) {
      addEntry(entries, {
        loc: buildLocalizedUrl(locale, suffix),
        alternates: cluster,
      });
    }
  }

  addEntry(entries, { loc: buildLocalizedUrl('pt-PT', '/lp') });

  for (const page of getIndexableLandingPages()) {
    addEntry(entries, {
      loc: buildLocalizedUrl(page.locale, `/lp/${page.slug}`),
      lastmod: toLastmod(page.updatedAt),
    });
  }

  for (const story of stories) {
    addEntry(entries, {
      loc: buildLocalizedUrl(normalizeLocale(story.storyLanguage), `/p/${story.slug}`),
      lastmod: toLastmod(story.updatedAt),
    });
  }

  const blogGroups = new Map<string, typeof blogTranslations>();
  for (const translation of blogTranslations) {
    if (!locales.includes(translation.locale)) continue;
    const validation = validateMdxSource(translation.contentMdx);
    if (!validation.ok) {
      throw new Error(
        `Published blog translation ${translation.locale}/${translation.slug} has invalid MDX: ${validation.reason}`,
      );
    }
    const group = blogGroups.get(translation.slugBase) ?? [];
    group.push(translation);
    blogGroups.set(translation.slugBase, group);
  }

  for (const translations of blogGroups.values()) {
    const seenLocales = new Set<string>();
    const alternates = translations.map((translation) => {
      if (seenLocales.has(translation.locale)) {
        throw new Error(
          `Duplicate blog translation locale ${translation.locale} for ${translation.slugBase}`,
        );
      }
      seenLocales.add(translation.locale);
      return {
        hreflang: translation.locale.toLowerCase(),
        href: buildLocalizedUrl(translation.locale, `/blog/${translation.slug}`),
      };
    });

    for (const translation of translations) {
      addEntry(entries, {
        loc: buildLocalizedUrl(translation.locale, `/blog/${translation.slug}`),
        lastmod: latestLastmod([
          translation.publishedAt,
          translation.postUpdatedAt,
          translation.translationUpdatedAt,
        ]),
        alternates,
      });
    }
  }

  validateAlternateReciprocity(entries);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...entries.values()].map(serializeEntry).join('\n')}
</urlset>`;
}

function addEntry(entries: Map<string, SitemapEntry>, entry: SitemapEntry): void {
  const url = new URL(entry.loc);
  if (url.origin !== BASE_URL || url.protocol !== 'https:' || url.hostname !== 'mythoria.pt') {
    throw new Error(`Noncanonical sitemap origin: ${entry.loc}`);
  }
  if (url.pathname !== normalizePathname(url.pathname)) {
    throw new Error(`Noncanonical sitemap pathname: ${entry.loc}`);
  }

  const policy = getSeoRoutePolicy(url.pathname);
  if (!policy.indexable || !policy.includeInSitemap) {
    throw new Error(`Route is not sitemap eligible: ${entry.loc}`);
  }
  if (entries.has(entry.loc)) {
    throw new Error(`Duplicate sitemap URL: ${entry.loc}`);
  }
  if (entry.lastmod) assertLastmod(entry.lastmod, entry.loc);

  entries.set(entry.loc, entry);
}

function toLastmod(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid sitemap timestamp: ${value}`);
  return date.toISOString();
}

function latestLastmod(values: Array<Date | null>): string | undefined {
  const dates = values.filter((value): value is Date => value instanceof Date);
  if (!dates.length) return undefined;
  return new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString();
}

function assertLastmod(lastmod: string, loc: string): void {
  const timestamp = new Date(lastmod).getTime();
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60_000) {
    throw new Error(`Invalid or future lastmod for ${loc}: ${lastmod}`);
  }
}

function validateAlternateReciprocity(entries: Map<string, SitemapEntry>): void {
  for (const entry of entries.values()) {
    for (const alternate of entry.alternates ?? []) {
      const target = entries.get(alternate.href);
      if (!target) throw new Error(`Missing alternate target ${alternate.href} from ${entry.loc}`);
      if (alternate.hreflang === 'x-default') continue;
      if (!(target.alternates ?? []).some((candidate) => candidate.href === entry.loc)) {
        throw new Error(`Nonreciprocal alternate ${entry.loc} -> ${alternate.href}`);
      }
    }
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function serializeEntry(entry: SitemapEntry): string {
  const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
  const alternates = (entry.alternates ?? [])
    .map(
      (alternate) =>
        `\n    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(alternate.href)}"/>`,
    )
    .join('');

  return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}${alternates}\n  </url>`;
}
