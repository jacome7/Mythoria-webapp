import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { BlogLocale, BLOG_SUPPORTED_LOCALES, blogService } from '@/db/services/blog';
import { mdxComponents } from '@/lib/blog/mdx-components';
import { calculateReadingTimeFromMdx } from '@/lib/blog/readingTime';
import { validateMdxSource } from '@/lib/blog/mdx-validate';
import { routing } from '@/i18n/routing';
import ShareButton from '@/components/ShareButton';
import BackToTopButton from '@/components/BackToTopButton';
import InlineMarkdown from '@/lib/blog/InlineMarkdown';
import { formatDate } from '@/utils/date';
import { buildLocalizedPath, buildLocalizedUrl } from '@/lib/seo';
import { resolveBlogPostRoute, type BlogRouteResolution } from '@/lib/blog-route';

interface BlogPostPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!BLOG_SUPPORTED_LOCALES.includes(locale as BlogLocale)) {
    return { title: 'Not Found', robots: 'noindex,nofollow' };
  }

  try {
    const resolution = await resolveBlogPostRoute(locale as BlogLocale, slug);
    if (resolution.type === 'notFound') {
      return { title: 'Not Found', robots: 'noindex,nofollow' };
    }

    if (resolution.type === 'redirect') {
      return {
        title: 'Redirecting\u2026',
        robots: 'noindex,nofollow',
        alternates: {
          canonical: buildLocalizedUrl(resolution.locale, `/blog/${resolution.slug}`),
        },
      };
    }

    const { post, translations } = resolution;
    const pageUrl = buildLocalizedUrl(locale, `/blog/${post.slug}`);
    const hreflangLinks = translations.reduce<Record<string, string>>((acc, translation) => {
      acc[translation.locale] = buildLocalizedUrl(translation.locale, `/blog/${translation.slug}`);
      return acc;
    }, {});

    return {
      title: post.title,
      description: post.summary,
      robots: 'index,follow,max-snippet:-1,max-image-preview:large',
      alternates: {
        canonical: pageUrl,
        languages: hreflangLinks,
      },
      openGraph: {
        title: post.title,
        description: post.summary,
        type: 'article',
        publishedTime: post.publishedAt?.toISOString(),
        url: pageUrl,
        images: post.heroImageUrl ? [{ url: post.heroImageUrl }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.summary,
        images: post.heroImageUrl ? [post.heroImageUrl] : undefined,
      },
    };
  } catch (error) {
    console.error('Failed to generate metadata for blog post:', error);
    return { title: 'Blog Post' };
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  if (!BLOG_SUPPORTED_LOCALES.includes(locale as BlogLocale)) {
    notFound();
  }

  const tBlogPost = await getTranslations({ locale, namespace: 'BlogPost' });

  // Fetch data before rendering — errors bubble to the nearest error.tsx boundary
  let resolution: BlogRouteResolution;
  try {
    resolution = await resolveBlogPostRoute(locale as BlogLocale, slug);
  } catch (error) {
    console.error('Failed to load blog post:', error);
    notFound();
  }

  if (resolution.type === 'notFound') {
    notFound();
  }

  if (resolution.type === 'redirect') {
    permanentRedirect(buildLocalizedPath(resolution.locale, `/blog/${resolution.slug}`));
  }

  const { post } = resolution;

  const validation = validateMdxSource(post.contentMdx);
  if (!validation.ok) {
    console.error('Invalid MDX content:', validation.reason);
    notFound();
  }

  let adjacentPosts = null;
  try {
    adjacentPosts = await blogService.getAdjacent(locale as BlogLocale, post.publishedAt!);
  } catch (error) {
    console.warn('Failed to load adjacent posts:', error);
  }

  const readingTime = calculateReadingTimeFromMdx(post.contentMdx);
  const pageUrl = buildLocalizedUrl(locale, `/blog/${post.slug}`);

  return (
    <div className="min-h-screen bg-base-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            datePublished: post.publishedAt?.toISOString(),
            dateModified: post.publishedAt?.toISOString(),
            image: post.heroImageUrl ? [post.heroImageUrl] : undefined,
            inLanguage: locale,
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': pageUrl,
            },
            description: post.summary,
          }),
        }}
      />
      <div className="bg-base-200 border-b border-base-300">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/${locale}/blog`} className="btn btn-ghost btn-sm gap-2 hover:bg-base-300">
            <ArrowLeft className="w-4 h-4" />
            {tBlogPost('backToList')}
          </Link>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-base-content/60 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {tBlogPost('publishedOn', {
                    date: formatDate(post.publishedAt!, {
                      locale,
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }),
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  {readingTime} {tBlogPost('readingTime')}
                </span>
              </div>
            </div>

            <ShareButton
              title={post.title}
              summary={post.summary}
              url={pageUrl}
              shareText={tBlogPost('sharePost')}
            />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-primary">
            {post.title}
          </h1>

          {post.heroImageUrl && (
            <div className="mb-8">
              <Image
                src={post.heroImageUrl}
                alt={post.title}
                width={800}
                height={600}
                className="w-full h-80 md:h-[28rem] object-cover rounded-lg shadow-lg"
                unoptimized={post.heroImageUrl.startsWith('http')}
                priority
              />
            </div>
          )}

          <InlineMarkdown
            text={post.summary}
            className="text-xl text-base-content/80 leading-relaxed mb-8 italic border-l-4 border-primary pl-6"
          />
        </header>

        <div className="prose prose-lg max-w-none mb-12">
          <MDXRemote
            source={post.contentMdx}
            components={mdxComponents}
            options={{
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
            }}
          />
        </div>
      </article>

      {adjacentPosts && (adjacentPosts.previous || adjacentPosts.next) && (
        <nav className="bg-base-200 border-t border-base-300">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                {adjacentPosts.previous ? (
                  <Link
                    href={`/${locale}/blog/${adjacentPosts.previous.slug}`}
                    className="block group"
                  >
                    <div className="text-sm text-base-content/60 mb-2">
                      &larr; {tBlogPost('previousPost')}
                    </div>
                    <div className="text-lg font-semibold group-hover:text-primary transition-colors">
                      {adjacentPosts.previous.title}
                    </div>
                  </Link>
                ) : (
                  <div></div>
                )}
              </div>

              <div className="space-y-2 md:text-right">
                {adjacentPosts.next ? (
                  <Link href={`/${locale}/blog/${adjacentPosts.next.slug}`} className="block group">
                    <div className="text-sm text-base-content/60 mb-2">
                      {tBlogPost('nextPost')} &rarr;
                    </div>
                    <div className="text-lg font-semibold group-hover:text-primary transition-colors">
                      {adjacentPosts.next.title}
                    </div>
                  </Link>
                ) : (
                  <div></div>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}

      <BackToTopButton />
    </div>
  );
}
