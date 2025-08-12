import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { FiCalendar, FiClock } from 'react-icons/fi';
import { blogService, BlogLocale, BLOG_SUPPORTED_LOCALES } from '@/db/services/blog';
import InlineMarkdown from '@/lib/blog/InlineMarkdown';
import { routing } from '@/i18n/routing';
import { calculateReadingTimeFromMdx } from '@/lib/blog/readingTime';
import { generateHreflangLinks } from '@/lib/hreflang';

interface BlogListPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog.metadata' });
  const baseUrl = 'https://mythoria.pt';
  const hreflangLinks = generateHreflangLinks(locale, `/${locale}/blog`);
  
  return {
    title: t('listTitle'),
    description: t('listDescription'),
    robots: 'index,follow,max-snippet:-1,max-image-preview:large',
    alternates: {
      canonical: `${baseUrl}/${locale}/blog/`,
      languages: hreflangLinks,
    },
    openGraph: {
      title: t('listTitle'),
      description: t('listDescription'),
      type: 'website',
      url: `${baseUrl}/${locale}/blog/`,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('listTitle'),
      description: t('listDescription'),
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// Note: use calculateReadingTimeFromMdx from '@/lib/blog/readingTime'

export default async function BlogListPage({
  params,
  searchParams,
}: BlogListPageProps) {
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
  
  const t = await getTranslations('blog.list');
  const currentPage = parseInt(page || '1', 10);
  const postsPerPage = 10;
  const offset = (currentPage - 1) * postsPerPage;
  
  try {
    const posts = await blogService.getPublishedList(locale as BlogLocale, {
      limit: postsPerPage,
      offset,
    });
    
    return (
      <div className="min-h-screen bg-base-100">
        <div className="container mx-auto px-4 py-12">
          {/* Header Section */}
          <header className="text-center mb-8">
            <h1 className="text-5xl font-bold text-primary">{t('title')}</h1>
            <p className="text-xl mt-4 text-gray-700">{t('subtitle')}</p>
          </header>

          {/* Blog Posts */}
          <section className="max-w-6xl mx-auto px-4 pt-8 pb-8">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="mb-8">
                <div className="text-6xl mb-4">📜</div>
                <h2 className="text-2xl font-bold mb-4">{t('noPostsFound')}</h2>
                <p className="text-base-content/70 max-w-md mx-auto">
                  {t('noPostsFoundDescription')}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 md:gap-12">
              {posts.map((post, index) => (
                <article
                  key={post.id}
                  className={`card lg:card-side bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300 border border-base-300 ${
                    index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  {/* Post Image */}
                  <div className="lg:w-2/5">
                    <figure className="h-64 lg:h-full">
                      <Image
                        src={post.heroImageUrl || '/placeholder-story-image.jpg'}
                        alt={post.title}
                        width={600}
                        height={400}
                        className="w-full h-full object-cover"
                        unoptimized={post.heroImageUrl?.startsWith('http')}
                      />
                    </figure>
                  </div>
                  
                  {/* Post Content */}
                  <div className="lg:w-3/5 card-body p-8">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-base-content/60 mb-4">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="w-4 h-4" />
                        <span>
                          {t('publishedOn')} {formatDate(post.publishedAt!, locale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="w-4 h-4" />
                        <span>{calculateReadingTimeFromMdx(post.contentMdx ?? post.summary)} {t('readingTime', { ns: 'blog.post' })}</span>
                      </div>
                    </div>
                    
                    <h2 className="card-title text-2xl md:text-3xl mb-4 line-clamp-2">
                      <Link 
                        href={`/${locale}/blog/${post.slug}`}
                        className="hover:text-primary transition-colors"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    
                    <InlineMarkdown
                      text={post.summary}
                      className="text-base-content/80 leading-relaxed mb-6 line-clamp-3"
                    />
                    
                    <div className="card-actions justify-end">
                      <Link
                        href={`/${locale}/blog/${post.slug}`}
                        className="btn btn-primary btn-outline hover:btn-primary"
                      >
                        {t('readMore')}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {posts.length === postsPerPage && (
            <div className="text-center mt-16">
              <Link
                href={`/${locale}/blog?page=${currentPage + 1}`}
                className="btn btn-primary btn-lg"
              >
                {t('loadMore')}
              </Link>
            </div>
          )}
        </section>

        </div>
      </div>
    );
  } catch (error) {
    console.error('Failed to load blog posts:', error);
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
}
