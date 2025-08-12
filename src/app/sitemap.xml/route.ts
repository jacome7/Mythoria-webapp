import { NextResponse } from 'next/server';
import { storyService } from '@/db/services';
import { blogService, BlogLocale } from '@/db/services/blog';
import { routing } from '@/i18n/routing';

const baseUrl = 'https://mythoria.pt';
const locales = routing.locales as readonly string[];

// Static pages that should be included in the sitemap
const staticPages = [
  '',  // Home page
  'aboutUs',
  'contactUs',
  'pricing',
  'privacy-policy',
  'termsAndConditions',
  'tell-your-story',
  'get-inspired'
];

export async function GET() {
  try {
    const sitemap = await generateSitemap();
    
    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Fallback to static sitemap
    return new NextResponse(null, { 
      status: 302,
      headers: { 'Location': '/sitemap.xml' }
    });
  }
}

async function generateSitemap(): Promise<string> {
  const urls: string[] = [];
  const currentDate = new Date().toISOString();
  
  // Add the default root page (redirects to default locale)
  urls.push(createUrlEntry(baseUrl, currentDate, 'weekly', '1.0'));
  
  // Add static pages for each locale with hreflang support
  staticPages.forEach(page => {
    const pageUrls = locales.map(locale => ({
      url: page === '' 
        ? `${baseUrl}/${locale}/`
        : `${baseUrl}/${locale}/${page}/`,
      locale: locale
    }));
    
    pageUrls.forEach(({ url }) => {
      // Higher priority for main pages and storytelling features
      const priority = page === '' || page === 'tell-your-story' ? '0.9' : 
                     page === 'stories' ? '0.9' : 
                     page === 'get-inspired' ? '0.8' : '0.7';
      
      const changefreq = page === 'stories' || page === 'get-inspired' ? 'daily' :
                        page === 'tell-your-story' || page === '' ? 'weekly' :
                        page === 'privacy-policy' || page === 'termsAndConditions' ? 'monthly' : 'weekly';
      
      const urlEntry = createUrlEntryWithHreflang(
        url,
        currentDate,
        changefreq,
        priority,
        pageUrls
      );
      urls.push(urlEntry);
    });
  });
  
  // Add stories index pages with hreflang support
  const storiesIndexUrls = locales.map(locale => ({
    url: `${baseUrl}/${locale}/stories/`,
    locale: locale
  }));
  
  storiesIndexUrls.forEach(({ url }) => {
    const urlEntry = createUrlEntryWithHreflang(
      url,
      currentDate,
      'daily',
      '0.9',
      storiesIndexUrls
    );
    urls.push(urlEntry);
  });

  // Add blog index pages with hreflang support
  const blogIndexUrls = locales.map(locale => ({
    url: `${baseUrl}/${locale}/blog/`,
    locale: locale
  }));

  blogIndexUrls.forEach(({ url }) => {
    const urlEntry = createUrlEntryWithHreflang(
      url,
      currentDate,
      'weekly',
      '0.8',
      blogIndexUrls
    );
    urls.push(urlEntry);
  });
  
  // Add featured stories to sitemap with multilingual support
  // Skip database operations during build time
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test';
  
  if (!isBuildTime) {
    try {
      const featuredStories = await storyService.getFeaturedPublicStories();
      
      featuredStories.forEach(story => {
        if (story.slug) {
          // Create entry for each featured story with hreflang support
          const storyUrls = locales.map(locale => ({
            url: `${baseUrl}/${locale}/p/${story.slug}/`,
            locale: locale
          }));
          
          storyUrls.forEach(({ url }) => {
            // Create the main URL entry
            const urlEntry = createUrlEntryWithHreflang(
              url,
              story.createdAt.toISOString(),
              'weekly',
              '0.8',
              storyUrls
            );
            urls.push(urlEntry);
          });
        }
      });
    } catch (error) {
      console.error('Error fetching featured stories for sitemap:', error);
      // Continue without featured stories if there's an error
    }
  }

  // Add blog posts (published) to sitemap with hreflang alternates
  if (!isBuildTime) {
    try {
      // Collect all posts across locales by slugBase to avoid duplicates
      const seenSlugBases = new Set<string>();
      for (const locale of locales) {
        const posts = await blogService.getPublishedList(locale as BlogLocale, { limit: 1000, offset: 0 });
        for (const post of posts) {
          if (seenSlugBases.has(post.slugBase)) continue;
          seenSlugBases.add(post.slugBase);
          // Fetch translations for hreflang
          const translations = await blogService.getPublishedTranslationsBySlugBase(post.slugBase);
          const alternateUrls = translations.map(t => ({
            url: `${baseUrl}/${t.locale}/blog/${t.slug}/`,
            locale: t.locale,
          }));
          // Prefer using the current locale's URL if available, otherwise the first translation
          const primary = alternateUrls.find(a => a.locale === locale) || alternateUrls[0];
          if (primary) {
            urls.push(
              createUrlEntryWithHreflang(
                primary.url,
                (post.publishedAt ?? new Date()).toISOString(),
                'weekly',
                '0.7',
                alternateUrls
              )
            );
          }
        }
      }
    } catch (error) {
      console.error('Error fetching blog posts for sitemap:', error);
    }
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;
}

function createUrlEntry(
  url: string, 
  lastmod: string, 
  changefreq: string, 
  priority: string
): string {
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function createUrlEntryWithHreflang(
  url: string,
  lastmod: string,
  changefreq: string,
  priority: string,
  alternateUrls: Array<{ url: string; locale: string }>
): string {
  const hreflangLinks = alternateUrls.map(({ url: altUrl, locale }) => {
    // Convert locale format from 'en-US' to 'en-us' for hreflang
    const hreflangCode = locale.toLowerCase();
    return `    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${altUrl}"/>`;
  }).join('\n');
  
  // Add x-default pointing to the main site (you could also point to a language selector)
  const xDefaultLink = `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/"/>`;
  
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${hreflangLinks}
${xDefaultLink}
  </url>`;
}
