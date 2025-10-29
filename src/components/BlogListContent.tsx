'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FiCalendar, FiClock } from 'react-icons/fi';
import InlineMarkdown from '@/lib/blog/InlineMarkdown';
import ScrollFadeIn from '@/components/ScrollFadeIn';
import { calculateReadingTimeFromMdx } from '@/lib/blog/readingTime';
import { formatDate } from '@/utils/date';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  heroImageUrl: string | null;
  publishedAt: Date | null;
  contentMdx?: string | null;
}

interface BlogListContentProps {
  posts: BlogPost[] | undefined;
  locale: string;
  currentPage: number;
  postsPerPage: number;
  translations: {
    title: string;
    subtitle: string;
    noPostsFound: string;
    noPostsFoundDescription: string;
    publishedOn: string;
    readingTime: string;
    readMore: string;
    loadMore: string;
  };
}

export default function BlogListContent({
  posts,
  locale,
  currentPage,
  postsPerPage,
  translations: t,
}: BlogListContentProps) {
  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header Section */}
        <ScrollFadeIn>
          <header className="text-center mb-8">
            <h1 className="text-5xl font-bold text-primary">{t.title}</h1>
            <p className="text-xl mt-4 text-gray-700">{t.subtitle}</p>
          </header>
        </ScrollFadeIn>

        {/* Blog Posts */}
        <ScrollFadeIn delay={100}>
          <section className="max-w-6xl mx-auto px-4 pt-8 pb-8">
            {!posts || posts.length === 0 ? (
              <div className="text-center py-16">
                <div className="mb-8">
                  <div className="text-6xl mb-4">📜</div>
                  <h2 className="text-2xl font-bold mb-4">{t.noPostsFound}</h2>
                  <p className="text-base-content/70 max-w-md mx-auto">
                    {t.noPostsFoundDescription}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-8 md:gap-12">
                {posts.map((post, index) => (
                  <ScrollFadeIn
                    key={post.id}
                    delay={200 + index * 100}
                    threshold={0.1}
                    rootMargin="0px 0px -20px 0px"
                  >
                    <article
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
                              {t.publishedOn}{' '}
                              {formatDate(post.publishedAt!, {
                                locale,
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiClock className="w-4 h-4" />
                            <span>
                              {calculateReadingTimeFromMdx(post.contentMdx ?? post.summary)}{' '}
                              {t.readingTime}
                            </span>
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
                            {t.readMore}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 ml-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </article>
                  </ScrollFadeIn>
                ))}
              </div>
            )}

            {/* Pagination */}
            {posts && posts.length === postsPerPage && (
              <ScrollFadeIn delay={100}>
                <div className="text-center mt-16">
                  <Link
                    href={`/${locale}/blog?page=${currentPage + 1}`}
                    className="btn btn-primary btn-lg"
                  >
                    {t.loadMore}
                  </Link>
                </div>
              </ScrollFadeIn>
            )}
          </section>
        </ScrollFadeIn>
      </div>
    </div>
  );
}
