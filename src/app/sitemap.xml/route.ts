import { NextResponse } from 'next/server';
import { generateSitemap } from './build-sitemap';

export const dynamic = 'force-dynamic';

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
