import { NextRequest, NextResponse } from 'next/server';
import { faqService } from '@/db/services';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeStringify from 'rehype-stringify';

// Mark this route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';

// Cache for 5 minutes (300 seconds)
export const revalidate = 300;

/** Compile a markdown/MDX string to a sanitised HTML string. */
async function compileMarkdownToHtml(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'wrap',
      properties: {
        className: ['no-underline', 'hover:no-underline', 'focus:no-underline'],
      },
    })
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}

async function compileFaqSections(sections: any[]) {
  return Promise.all(
    (sections || []).map(async (section) => ({
      ...section,
      entries: await Promise.all(
        section.entries.map(async (entry: any) => {
          try {
            const contentHtml = await compileMarkdownToHtml(entry.contentMdx);
            return { ...entry, contentHtml };
          } catch (error) {
            console.error('Failed to compile FAQ entry MDX', { entryId: entry.id }, error);
            return { ...entry, contentHtml: '<p>Content temporarily unavailable.</p>' };
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
