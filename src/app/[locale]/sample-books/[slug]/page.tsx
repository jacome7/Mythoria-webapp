import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import SampleBookDetailPage from '@/components/SampleBookDetailPage';
import { getSeoSampleBook } from '@/content/sample-books/seo';
import { buildPublicRedirectSearch } from '@/lib/campaign-context';
import { getSampleBookBySlug, getSampleBookChapter } from '@/lib/sample-books/catalog';
import { buildAbsoluteUrl, buildLocalizedUrl } from '@/lib/seo';

interface SampleBookRouteProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: SampleBookRouteProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const [book, seo] = await Promise.all([
    getSampleBookBySlug(slug),
    Promise.resolve(getSeoSampleBook(slug)),
  ]);
  if (!book) return {};

  const canonicalLocale = seo?.locale ?? book.locale;
  const canonical = buildLocalizedUrl(canonicalLocale, `/sample-books/${book.slug}`);
  const indexable = Boolean(seo && locale === canonicalLocale);

  return {
    title: `${book.title} — exemplo ficcional | Mythoria`,
    description: book.synopsis,
    robots: indexable ? 'index,follow,max-snippet:-1,max-image-preview:large' : 'noindex,follow',
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: `${book.title} — exemplo ficcional`,
      description: book.synopsis,
      url: canonical,
      locale: canonicalLocale.replace('-', '_'),
      images: [{ url: buildAbsoluteUrl(book.coverSrc), alt: `Capa de ${book.title}` }],
      modifiedTime: seo?.updatedAt ?? book.updatedAt,
    },
  };
}

export default async function SampleBookPage({ params, searchParams }: SampleBookRouteProps) {
  const [{ locale, slug }, query] = await Promise.all([params, searchParams]);
  const book = await getSampleBookBySlug(slug);
  if (!book) notFound();

  const seo = getSeoSampleBook(slug);
  const canonicalLocale = seo?.locale ?? book.locale;
  if (locale !== canonicalLocale) {
    permanentRedirect(
      `/${canonicalLocale}/sample-books/${book.slug}${buildPublicRedirectSearch(query)}`,
    );
  }

  const chapter = await getSampleBookChapter(book);
  const canonical = buildLocalizedUrl(canonicalLocale, `/sample-books/${book.slug}`);
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: book.title,
      description: book.synopsis,
      inLanguage: book.locale,
      url: canonical,
      dateModified: seo?.updatedAt ?? book.updatedAt,
      image: [book.coverSrc, book.featureSrc, book.chapterImageSrc]
        .filter((src): src is string => Boolean(src))
        .map(buildAbsoluteUrl),
      isBasedOn: 'Fictional editorial demonstration created by Mythoria',
      publisher: { '@type': 'Organization', name: 'Mythoria' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Mythoria',
          item: buildLocalizedUrl(canonicalLocale),
        },
        ...(seo
          ? [
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Guias',
                item: buildLocalizedUrl(canonicalLocale, '/lp'),
              },
            ]
          : []),
        {
          '@type': 'ListItem',
          position: seo ? 3 : 2,
          name: book.title,
          item: canonical,
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SampleBookDetailPage book={book} chapter={chapter} locale={locale} seo={seo} />
    </>
  );
}
