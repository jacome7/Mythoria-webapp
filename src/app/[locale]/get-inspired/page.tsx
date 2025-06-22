'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface FeaturedStory {
  storyId: string;
  title: string;
  slug: string;
  featureImageUri: string | null;
  author: string;
  createdAt: string;
}

export default function GetInspiredPage() {
  const locale = useLocale();
  const t = useTranslations('GetInspiredPage');
  const [featuredStories, setFeaturedStories] = useState<FeaturedStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedStories = async () => {
      try {
        const response = await fetch('/api/stories/featured');
        if (response.ok) {
          const data = await response.json();
          setFeaturedStories(data.stories || []);
        }
      } catch (error) {
        console.error('Error fetching featured stories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedStories();
  }, []);
    return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Gallery Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            {t('gallery.title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('gallery.subtitle')}
          </p>
        </div>

        {loading ? (
          /* Loading State */
          <div className="flex justify-center items-center py-16">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : featuredStories.length > 0 ? (
          /* Featured Stories Gallery */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
            {featuredStories.map((story) => (
              <div key={story.storyId} className="card bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <figure className="px-4 pt-4">
                  <div className="relative w-full h-80 rounded-xl overflow-hidden">
                    <Image
                      src={story.featureImageUri || '/Mythoria-logo-white-512x336.jpg'}
                      alt={`${story.title} - Story cover`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.src = '/Mythoria-logo-white-512x336.jpg';
                      }}
                    />
                  </div>
                </figure>
                <div className="card-body text-center">
                  <h3 className="card-title justify-center text-lg font-bold text-gray-800">
                    {story.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {t('gallery.createdBy')} <span className="font-semibold">{story.author}</span>
                  </p>
                  <div className="card-actions justify-center">
                    <Link 
                      href={`/${locale}/p/${story.slug}`}
                      className="btn btn-primary btn-sm"
                    >
                      {t('gallery.viewStory')}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                {t('gallery.emptyTitle', { default: 'No Featured Stories Yet' })}
              </h3>
              <p className="text-gray-600 mb-8">
                {t('gallery.emptyMessage', { default: 'Create your own story and share it with the world!' })}
              </p>
              <Link 
                href={`/${locale}/dashboard`}
                className="btn btn-primary"
              >
                {t('gallery.createStory', { default: 'Create Your Story' })}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
