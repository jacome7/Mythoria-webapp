import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import SampleBookDetailPage from '@/components/SampleBookDetailPage';
import { getSeoSampleBook } from '@/content/sample-books/seo';
import { buildPublicRedirectSearch, buildStoryAuthReturnSearch } from '@/lib/campaign-context';
import { getTranslations } from 'next-intl/server';
import { getTemplateForSample } from '@/lib/story-templates/catalog';
import { getStoryTemplateAccess } from '@/lib/story-templates/access';
import { getSampleBookBySlug, getSampleBookChapter } from '@/lib/sample-books/catalog';
import { buildAbsoluteUrl, buildLocalizedUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

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
  const isMythoriaCreatedExample = book.publicProvenance === 'mythoria_created_example';
  const isFictionalBook = Boolean(book.fictionalUserContext) && !isMythoriaCreatedExample;

  return {
    title: `${book.title}${isFictionalBook ? ' — exemplo ficcional' : ''} | Mythoria`,
    description: book.synopsis,
    robots: indexable ? 'index,follow,max-snippet:-1,max-image-preview:large' : 'noindex,follow',
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: `${book.title}${isFictionalBook ? ' — exemplo ficcional' : ''}`,
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
    const safeQuery = buildPublicRedirectSearch(query);
    permanentRedirect(
      `/${canonicalLocale}/sample-books/${book.slug}${safeQuery.size ? `?${safeQuery}` : ''}`,
    );
  }

  const chapter = await getSampleBookChapter(book);
  const template = (await getStoryTemplateAccess())
    ? getTemplateForSample(book.slug, locale)
    : null;
  let createSimilar: { href: string; label: string } | undefined;
  if (template) {
    const safeQuery = buildStoryAuthReturnSearch(query);
    safeQuery.set('templateId', template.id);
    const t = await getTranslations({ locale, namespace: 'StoryTemplates' });
    createSimilar = {
      href: `/${locale}/tell-your-story/step-1?${safeQuery}`,
      label: t('createSimilar'),
    };
  }
  const canonical = buildLocalizedUrl(canonicalLocale, `/sample-books/${book.slug}`);
  const isMythoriaCreatedExample = book.publicProvenance === 'mythoria_created_example';
  const isFictionalBook = Boolean(book.fictionalUserContext) && !isMythoriaCreatedExample;
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
      isBasedOn: isMythoriaCreatedExample
        ? 'Demonstration book created by Mythoria with synthetic source inputs'
        : isFictionalBook
          ? 'Fictional editorial demonstration created by Mythoria'
          : 'Printed personalized book created with Mythoria',
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
      <SampleBookDetailPage
        book={book}
        chapter={chapter}
        locale={locale}
        seo={seo}
        createSimilar={createSimilar}
      />
    </>
  );
}
