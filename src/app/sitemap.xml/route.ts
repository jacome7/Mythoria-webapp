import { NextResponse } from 'next/server';

const baseUrl = 'https://mythoria.pt';
const locales = ['en-US', 'pt-PT'];

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
  
  // Add static pages for each locale
  locales.forEach(locale => {
    staticPages.forEach(page => {
      const url = page === '' 
        ? `${baseUrl}/${locale}/`
        : `${baseUrl}/${locale}/${page}/`;
      
      // Higher priority for main pages and storytelling features
      const priority = page === '' || page === 'tell-your-story' ? '0.9' : 
                     page === 'stories' ? '0.9' : 
                     page === 'get-inspired' ? '0.8' : '0.7';
      
      const changefreq = page === 'stories' || page === 'get-inspired' ? 'daily' :
                        page === 'tell-your-story' || page === '' ? 'weekly' :
                        page === 'privacy-policy' || page === 'termsAndConditions' ? 'monthly' : 'weekly';
      
      urls.push(createUrlEntry(url, currentDate, changefreq, priority));
    });
  });
  
  // Add stories index pages
  locales.forEach(locale => {
    urls.push(createUrlEntry(
      `${baseUrl}/${locale}/stories/`,
      currentDate,
      'daily',
      '0.9'
    ));
  });
  
  // TODO: In the future, you can add dynamic story URLs here
  // Example: Fetch published stories from database and add them
  // const stories = await getPublishedStories();
  // stories.forEach(story => {
  //   locales.forEach(locale => {
  //     urls.push(createUrlEntry(
  //       `${baseUrl}/${locale}/s/${story.slug}/`,
  //       story.updatedAt,
  //       'weekly',
  //       '0.8'
  //     ));
  //   });
  // });
  
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
