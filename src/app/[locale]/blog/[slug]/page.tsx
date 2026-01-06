import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiCalendar, FiClock, FiHeadphones } from 'react-icons/fi';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { blogService, BlogLocale, BLOG_SUPPORTED_LOCALES } from '@/db/services/blog';
import { mdxComponents } from '@/lib/blog/mdx-components';
import { calculateReadingTimeFromMdx } from '@/lib/blog/readingTime';
import { validateMdxSource } from '@/lib/blog/mdx-validate';
import { routing } from '@/i18n/routing';
import ShareButton from '@/components/ShareButton';
import BackToTopButton from '@/components/BackToTopButton';
import InlineMarkdown from '@/lib/blog/InlineMarkdown';
import { formatDate } from '@/utils/date';
import { ElevenLabsAudioNative } from '@/components/ElevenLabsAudioNative';

interface BlogPostPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

const audioNativeConfig = {
  publicUserId: process.env.NEXT_PUBLIC_ELEVENLABS_AUDIO_NATIVE_PUBLIC_USER_ID,
  projectIds: {
    'en-US': process.env.NEXT_PUBLIC_ELEVENLABS_AUDIO_NATIVE_PROJECT_ID_EN_US,
    'pt-PT': process.env.NEXT_PUBLIC_ELEVENLABS_AUDIO_NATIVE_PROJECT_ID_PT_PT,
    'es-ES': process.env.NEXT_PUBLIC_ELEVENLABS_AUDIO_NATIVE_PROJECT_ID_ES_ES,
    'fr-FR': process.env.NEXT_PUBLIC_ELEVENLABS_AUDIO_NATIVE_PROJECT_ID_FR_FR,
    'de-DE': process.env.NEXT_PUBLIC_ELEVENLABS_AUDIO_NATIVE_PROJECT_ID_DE_DE,
    default: process.env.NEXT_PUBLIC_ELEVENLABS_AUDIO_NATIVE_PROJECT_ID_DEFAULT,
  } satisfies Partial<Record<BlogLocale | 'default', string | undefined>>,
};

function getAudioNativeProjectId(locale: string) {
  return audioNativeConfig.projectIds[locale as BlogLocale] ?? audioNativeConfig.projectIds.default;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!BLOG_SUPPORTED_LOCALES.includes(locale as BlogLocale)) {
    return { title: 'Not Found' };
  }

  try {
    const post = await blogService.getPublishedBySlug(locale as BlogLocale, slug);
    if (!post) {
      return { title: 'Not Found' };
    }
    const baseUrl = 'https://mythoria.pt';
    const pageUrl = `${baseUrl}/${locale}/blog/${post.slug}/`;
    // Build hreflang based on available translations for this post
    const translations = await blogService.getPublishedTranslationsBySlugBase(post.slugBase);
    const hreflangLinks = translations.reduce<Record<string, string>>((acc, t) => {
      acc[t.locale] = `${baseUrl}/${t.locale}/blog/${t.slug}/`;
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

  // Validate locale
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  // Check if locale is supported by blog
  if (!BLOG_SUPPORTED_LOCALES.includes(locale as BlogLocale)) {
    return <PostNotAvailable locale={locale} />;
  }

  const tBlogPost = await getTranslations({ locale, namespace: 'BlogPost' });

  try {
    const post = await blogService.getPublishedBySlug(locale as BlogLocale, slug);
    if (!post) {
      return <PostNotFound locale={locale} />;
    }

    // Validate MDX content for security
    const validation = validateMdxSource(post.contentMdx);
    if (!validation.ok) {
      console.error('Invalid MDX content:', validation.reason);
      return <PostError locale={locale} />;
    }

    // Get adjacent posts for navigation
    let adjacentPosts = null;
    try {
      adjacentPosts = await blogService.getAdjacent(locale as BlogLocale, post.publishedAt!);
    } catch (error) {
      console.warn('Failed to load adjacent posts:', error);
    }

    const readingTime = calculateReadingTimeFromMdx(post.contentMdx);
    const audioProjectId = getAudioNativeProjectId(locale);
    const audioAvailable = Boolean(audioNativeConfig.publicUserId && audioProjectId);
    const localeLabels = tBlogPost.raw('audioLocaleLabel') as Record<string, string>;
    const localeLabel = localeLabels[locale] ?? locale;

    return (
      <div className="min-h-screen bg-base-100">
        {/* JSON-LD Article schema for SEO */}
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
                '@id': `${process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt'}/${locale}/blog/${post.slug}`,
              },
              description: post.summary,
            }),
          }}
        />
        {/* Back Navigation */}
        <div className="bg-base-200 border-b border-base-300">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link href={`/${locale}/blog`} className="btn btn-ghost btn-sm gap-2 hover:bg-base-300">
              <FiArrowLeft className="w-4 h-4" />
              {tBlogPost('backToList')}
            </Link>
          </div>
        </div>

        {/* Article Header */}
        <article className="max-w-4xl mx-auto px-4 py-8">
          {/* Article Meta */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-base-content/60 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-4 h-4" />
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
                  <FiClock className="w-4 h-4" />
                  <span>
                    {readingTime} {tBlogPost('readingTime')}
                  </span>
                </div>
              </div>

              {/* Share Button */}
              <ShareButton
                title={post.title}
                summary={post.summary}
                url={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt'}/${locale}/blog/${post.slug}`}
                shareText={tBlogPost('sharePost')}
              />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-primary">
              {post.title}
            </h1>

            {/* Hero Image */}
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

            {/* Audio Native Player */}
            <section className="mb-10">
              <div className="flex items-start gap-3 mb-3">
                <div className="mt-1 rounded-full bg-primary/10 text-primary p-2">
                  <FiHeadphones className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-primary">
                    {tBlogPost('listenHeading')}
                  </h2>
                  <p className="text-base-content/70">
                    {tBlogPost('listenSubheading', { localeName: localeLabel })}
                  </p>
                </div>
              </div>

              {audioAvailable ? (
                <ElevenLabsAudioNative
                  publicUserId={audioNativeConfig.publicUserId}
                  projectId={audioProjectId}
                  size="small"
                  textColorRgba="rgba(38, 38, 38, 1)"
                  backgroundColorRgba="rgba(255, 255, 255, 0.92)"
                  placeholder={tBlogPost('audioLoading')}
                />
              ) : (
                <div className="alert alert-warning">
                  <span>{tBlogPost('audioUnavailable')}</span>
                </div>
              )}
            </section>
          </header>

          {/* Article Content */}
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
                        // Prevent underlines on autolinked headings
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

        {/* Post Navigation */}
        {adjacentPosts && (adjacentPosts.previous || adjacentPosts.next) && (
          <nav className="bg-base-200 border-t border-base-300">
            <div className="max-w-4xl mx-auto px-4 py-8">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Previous Post */}
                <div className="space-y-2">
                  {adjacentPosts.previous ? (
                    <Link
                      href={`/${locale}/blog/${adjacentPosts.previous.slug}`}
                      className="block group"
                    >
                      <div className="text-sm text-base-content/60 mb-2">
                        ← {tBlogPost('previousPost')}
                      </div>
                      <div className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {adjacentPosts.previous.title}
                      </div>
                    </Link>
                  ) : (
                    <div></div>
                  )}
                </div>

                {/* Next Post */}
                <div className="space-y-2 md:text-right">
                  {adjacentPosts.next ? (
                    <Link
                      href={`/${locale}/blog/${adjacentPosts.next.slug}`}
                      className="block group"
                    >
                      <div className="text-sm text-base-content/60 mb-2">
                        {tBlogPost('nextPost')} →
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

        {/* Back to Top Button */}
        <BackToTopButton />
      </div>
    );
  } catch (error) {
    console.error('Failed to load blog post:', error);
    return <PostError locale={locale} />;
  }
}

// Error Components
async function PostNotFound({ locale }: { locale: string }) {
  const tBlogPost = await getTranslations({ locale, namespace: 'BlogPost' });

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-8xl mb-6">🌫️</div>
        <h1 className="text-3xl font-bold mb-4">{tBlogPost('notFound')}</h1>
        <p className="text-base-content/70 mb-8">{tBlogPost('notFoundDescription')}</p>
        <Link href={`/${locale}/blog`} className="btn btn-primary btn-lg">
          <FiArrowLeft className="w-5 h-5 mr-2" />
          {tBlogPost('backToList')}
        </Link>
      </div>
    </div>
  );
}

async function PostNotAvailable({ locale }: { locale: string }) {
  const tBlogPost = await getTranslations({ locale, namespace: 'BlogPost' });

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-8xl mb-6">🌍</div>
        <h1 className="text-3xl font-bold mb-4">{tBlogPost('notAvailable')}</h1>
        <p className="text-base-content/70 mb-8">{tBlogPost('notAvailableDescription')}</p>
        <Link href={`/${locale}/blog`} className="btn btn-primary btn-lg">
          <FiArrowLeft className="w-5 h-5 mr-2" />
          {tBlogPost('backToList')}
        </Link>
      </div>
    </div>
  );
}

async function PostError({ locale }: { locale: string }) {
  const tBlogPost = await getTranslations({ locale, namespace: 'BlogPost' });

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-8xl mb-6">⚡</div>
        <h1 className="text-3xl font-bold mb-4">{tBlogPost('error')}</h1>
        <p className="text-base-content/70 mb-8">{tBlogPost('errorDescription')}</p>
        <Link href={`/${locale}/blog`} className="btn btn-primary btn-lg">
          <FiArrowLeft className="w-5 h-5 mr-2" />
          {tBlogPost('backToList')}
        </Link>
      </div>
    </div>
  );
}
