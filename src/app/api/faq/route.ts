import { NextRequest, NextResponse } from 'next/server';
import { faqService } from '@/db/services';
import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// Mark this route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';

// Cache for 5 minutes (300 seconds)
export const revalidate = 300;

async function compileFaqSections(sections: any[]) {
  return Promise.all(
    (sections || []).map(async (section) => ({
      ...section,
      entries: await Promise.all(
        section.entries.map(async (entry: any) => {
          try {
            const mdxSource = await serialize(entry.contentMdx, {
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [
                  rehypeSlug,
                  [
                    rehypeAutolinkHeadings,
                    {
                      behavior: 'wrap',
                      properties: {
                        className: ['no-underline', 'hover:no-underline', 'focus:no-underline'],
                      },
                    },
                  ],
                ],
              },
            });

            return {
              ...entry,
              mdxSource,
            };
          } catch (error) {
            console.error('Failed to compile FAQ entry MDX', { entryId: entry.id }, error);
            const fallbackSource = await serialize('Content temporarily unavailable.');
            return {
              ...entry,
              mdxSource: fallbackSource,
            };
          }
        }),
      ),
    })),
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en-US';
    const section = searchParams.get('section') || undefined;
    const search = searchParams.get('q') || undefined;

    // Validate locale
    const validLocales = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json(
        { error: 'Invalid locale. Must be one of: en-US, pt-PT, es-ES, fr-FR, de-DE' },
        { status: 400 },
      );
    }

    // If search query is provided, use full-text search
    if (search && search.trim()) {
      const searchResults = await faqService.searchFaqs(locale, search);
      return NextResponse.json(
        {
          success: true,
          locale,
          search,
          results: searchResults,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        },
      );
    }

    // Otherwise, get structured FAQ data by section
    const faqData = await faqService.getFaqData(locale, section, search);
    const compiledFaqData = await compileFaqSections(faqData);

    return NextResponse.json(
      {
        success: true,
        locale,
        ...(section && { section }),
        sections: compiledFaqData,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    console.error('Error fetching FAQ data:', error);
    return NextResponse.json({ error: 'Failed to fetch FAQ data' }, { status: 500 });
  }
}
