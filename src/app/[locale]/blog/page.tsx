import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { blogService, BlogLocale, BLOG_SUPPORTED_LOCALES } from '@/db/services/blog';
import { routing } from '@/i18n/routing';
import { generateHreflangLinks } from '@/lib/hreflang';
import BlogListContent from '@/components/BlogListContent';

interface BlogListPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tBlogMetadata = await getTranslations({
    locale,
    namespace: 'Blog.metadata',
  });
  const baseUrl = 'https://mythoria.pt';
  const hreflangLinks = generateHreflangLinks(locale, `/${locale}/blog`);

  return {
    title: tBlogMetadata('listTitle'),
    description: tBlogMetadata('listDescription'),
    robots: 'index,follow,max-snippet:-1,max-image-preview:large',
    alternates: {
      canonical: `${baseUrl}/${locale}/blog/`,
      languages: hreflangLinks,
    },
    openGraph: {
      title: tBlogMetadata('listTitle'),
      description: tBlogMetadata('listDescription'),
      type: 'website',
      url: `${baseUrl}/${locale}/blog/`,
    },
    twitter: {
      card: 'summary_large_image',
      title: tBlogMetadata('listTitle'),
      description: tBlogMetadata('listDescription'),
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Note: use calculateReadingTimeFromMdx from '@/lib/blog/readingTime'

export default async function BlogListPage({ params, searchParams }: BlogListPageProps) {
  const { locale } = await params;
  const { page } = await searchParams;

  // Validate locale
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  // Check if locale is supported by blog
  if (!BLOG_SUPPORTED_LOCALES.includes(locale as BlogLocale)) {
    notFound();
  }

  const t = await getTranslations('Blog.list');
  const currentPage = parseInt(page || '1', 10);
  const postsPerPage = 10;
  const offset = (currentPage - 1) * postsPerPage;

  let posts;
  let hasError = false;

  try {
    posts = await blogService.getPublishedList(locale as BlogLocale, {
      limit: postsPerPage,
      offset,
    });
  } catch (error) {
    console.error('Failed to load blog posts:', error);
    hasError = true;
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔮</div>
          <h1 className="text-2xl font-bold mb-4">{t('error')}</h1>
          <Link href={`/${locale}/blog`} className="btn btn-primary">
            {t('tryAgain')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <BlogListContent
      posts={posts}
      locale={locale}
      currentPage={currentPage}
      postsPerPage={postsPerPage}
      translations={{
        title: t('title'),
        subtitle: t('subtitle'),
        noPostsFound: t('noPostsFound'),
        noPostsFoundDescription: t('noPostsFoundDescription'),
        publishedOn: t('publishedOn'),
        readingTime: await getTranslations({ locale, namespace: 'BlogPost' }).then((t) =>
          t('readingTime'),
        ),
        readMore: t('readMore'),
        loadMore: t('loadMore'),
      }}
    />
  );
}
