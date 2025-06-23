'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// StarRating component
const StarRating = ({ rating, count }: { rating: number | null; count: number | null }) => {
  // Handle null/undefined ratings
  if (!rating || !count || count === 0) {
    return null;
  }

  // Ensure rating is a valid number
  const validRating = typeof rating === 'number' ? rating : 0;
  const validCount = typeof count === 'number' ? count : 0;

  const fullStars = Math.floor(validRating);
  const hasHalfStar = validRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1 justify-center">
      <div className="flex">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <svg key={`full-${i}`} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L0 6.91l6.564-.955L10 0l3.436 5.955L20 6.91l-5.245 4.635L15.878 18z"/>
          </svg>
        ))}
        {/* Half star */}
        {hasHalfStar && (
          <div className="relative">
            <svg className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L0 6.91l6.564-.955L10 0l3.436 5.955L20 6.91l-5.245 4.635L15.878 18z"/>
            </svg>
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L0 6.91l6.564-.955L10 0l3.436 5.955L20 6.91l-5.245 4.635L15.878 18z"/>
              </svg>
            </div>
          </div>
        )}
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <svg key={`empty-${i}`} className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L0 6.91l6.564-.955L10 0l3.436 5.955L20 6.91l-5.245 4.635L15.878 18z"/>
          </svg>
        ))}
      </div>
      <span className="text-sm text-gray-600 ml-1">
        {validRating.toFixed(1)} ({validCount})
      </span>
    </div>
  );
};

interface FeaturedStory {
  storyId: string;
  title: string;
  slug: string;
  featureImageUri: string | null;
  author: string;
  createdAt: string;
  targetAudience?: string;
  graphicalStyle?: string;
  storyLanguage?: string;
  averageRating?: number | null;
  ratingCount?: number | null;
}

interface Filters {
  targetAudience: string[];
  graphicalStyle: string[];
  storyLanguage: string[];
}

export default function GetInspiredPage() {
  const locale = useLocale();
  const t = useTranslations('GetInspiredPage');
  const [featuredStories, setFeaturedStories] = useState<FeaturedStory[]>([]);
  const [filteredStories, setFilteredStories] = useState<FeaturedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    targetAudience: [],
    graphicalStyle: [],
    storyLanguage: []
  });

  const targetAudienceOptions = [
    'children_0-2',
    'children_3-6',
    'children_7-10',
    'children_11-14',
    'young_adult_15-17',
    'adult_18+',
    'all_ages'
  ];

  const graphicalStyleOptions = [
    'cartoon',
    'realistic',
    'watercolor',
    'digital_art',
    'hand_drawn',
    'minimalist',
    'vintage',
    'comic_book',
    'anime',
    'pixar_style',
    'disney_style',
    'sketch',
    'oil_painting',
    'colored_pencil'
  ];

  const storyLanguageOptions = [
    'en-US',
    'pt-PT'
  ];

  const loadFeaturedStories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stories/featured');
      if (response.ok) {
        const data = await response.json();
        setFeaturedStories(data.stories || []);
        setFilteredStories(data.stories || []);
      }
    } catch (error) {
      console.error('Error fetching featured stories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeaturedStories();
  }, [loadFeaturedStories]);

  // Filter stories based on selected filters
  useEffect(() => {
    let filtered = featuredStories;

    if (filters.targetAudience.length > 0) {
      filtered = filtered.filter(story => 
        story.targetAudience && filters.targetAudience.includes(story.targetAudience)
      );
    }

    if (filters.graphicalStyle.length > 0) {
      filtered = filtered.filter(story => 
        story.graphicalStyle && filters.graphicalStyle.includes(story.graphicalStyle)
      );
    }

    if (filters.storyLanguage.length > 0) {
      filtered = filtered.filter(story => 
        story.storyLanguage && filters.storyLanguage.includes(story.storyLanguage)
      );
    }

    setFilteredStories(filtered);
  }, [featuredStories, filters]);

  const handleFilterToggle = (filterType: keyof Filters, value: string) => {
    setFilters(prev => {
      const currentFilters = prev[filterType];
      const newFilters = currentFilters.includes(value)
        ? currentFilters.filter(item => item !== value)
        : [...currentFilters, value];
      
      return {
        ...prev,
        [filterType]: newFilters
      };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      targetAudience: [],
      graphicalStyle: [],
      storyLanguage: []
    });
  };

  const hasActiveFilters = Object.values(filters).some(filterArray => filterArray.length > 0);

  return (    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Gallery Section */}
      <div className="container mx-auto px-4 pt-16 pb-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            {t('gallery.title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('gallery.subtitle')}
          </p>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-800">
              {t('filters.title')}
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="btn btn-outline btn-sm"
              >
                {t('filters.clearAll')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Target Audience Filter */}
            <div className="dropdown dropdown-bottom w-full">
              <div tabIndex={0} role="button" className="btn btn-outline w-full justify-between">
                <span>{t('filters.targetAudience')}</span>
                <div className="flex items-center gap-2">
                  {filters.targetAudience.length > 0 && (
                    <div className="badge badge-primary badge-sm">
                      {filters.targetAudience.length}
                    </div>
                  )}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-full p-2 shadow-lg max-h-64 overflow-y-auto">
                {targetAudienceOptions.map((option) => (
                  <li key={option}>
                    <label className="cursor-pointer label justify-start gap-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={filters.targetAudience.includes(option)}
                        onChange={() => handleFilterToggle('targetAudience', option)}
                      />
                      <span className="label-text">{t(`targetAudience.${option}`)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {/* Graphical Style Filter */}
            <div className="dropdown dropdown-bottom w-full">
              <div tabIndex={0} role="button" className="btn btn-outline w-full justify-between">
                <span>{t('filters.graphicalStyle')}</span>
                <div className="flex items-center gap-2">
                  {filters.graphicalStyle.length > 0 && (
                    <div className="badge badge-primary badge-sm">
                      {filters.graphicalStyle.length}
                    </div>
                  )}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-full p-2 shadow-lg max-h-64 overflow-y-auto">
                {graphicalStyleOptions.map((option) => (
                  <li key={option}>
                    <label className="cursor-pointer label justify-start gap-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={filters.graphicalStyle.includes(option)}
                        onChange={() => handleFilterToggle('graphicalStyle', option)}
                      />
                      <span className="label-text">{t(`graphicalStyle.${option}`)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {/* Story Language Filter */}
            <div className="dropdown dropdown-bottom w-full">
              <div tabIndex={0} role="button" className="btn btn-outline w-full justify-between">
                <span>{t('filters.storyLanguage')}</span>
                <div className="flex items-center gap-2">
                  {filters.storyLanguage.length > 0 && (
                    <div className="badge badge-primary badge-sm">
                      {filters.storyLanguage.length}
                    </div>
                  )}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-full p-2 shadow-lg max-h-64 overflow-y-auto">
                {storyLanguageOptions.map((option) => (
                  <li key={option}>
                    <label className="cursor-pointer label justify-start gap-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={filters.storyLanguage.includes(option)}
                        onChange={() => handleFilterToggle('storyLanguage', option)}
                      />
                      <span className="label-text">{t(`storyLanguage.${option}`)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {filters.targetAudience.map((filter) => (
                  <div key={`ta-${filter}`} className="badge badge-primary gap-2">
                    {t(`targetAudience.${filter}`)}
                    <button
                      onClick={() => handleFilterToggle('targetAudience', filter)}
                      className="btn btn-circle btn-ghost btn-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {filters.graphicalStyle.map((filter) => (
                  <div key={`gs-${filter}`} className="badge badge-secondary gap-2">
                    {t(`graphicalStyle.${filter}`)}
                    <button
                      onClick={() => handleFilterToggle('graphicalStyle', filter)}
                      className="btn btn-circle btn-ghost btn-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {filters.storyLanguage.map((filter) => (
                  <div key={`sl-${filter}`} className="badge badge-accent gap-2">
                    {t(`storyLanguage.${filter}`)}
                    <button
                      onClick={() => handleFilterToggle('storyLanguage', filter)}
                      className="btn btn-circle btn-ghost btn-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <div className="text-center mb-8">
            <p className="text-sm text-gray-500">
              {filteredStories.length} of {featuredStories.length} stories shown
            </p>
          </div>
        )}

        {loading ? (
          /* Loading State */
          <div className="flex justify-center items-center py-16">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : filteredStories.length > 0 ? (
          /* Featured Stories Gallery */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
            {filteredStories.map((story) => (
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
                  <p className="text-gray-600 mb-2">
                    {t('gallery.createdBy')} <span className="font-semibold">{story.author}</span>
                  </p>
                  
                  {/* Star Rating - only show if story has ratings */}
                  {story.averageRating && story.ratingCount && story.ratingCount > 0 && (
                    <div className="mb-3">
                      <StarRating 
                        rating={story.averageRating}
                        count={story.ratingCount}
                      />
                    </div>
                  )}
                  
                  {/* Story metadata badges */}
                  <div className="flex flex-wrap justify-center gap-1 mb-4">
                    {story.targetAudience && (
                      <div className="badge badge-primary badge-xs">
                        {t(`targetAudience.${story.targetAudience}`)}
                      </div>
                    )}
                    {story.graphicalStyle && (
                      <div className="badge badge-secondary badge-xs">
                        {t(`graphicalStyle.${story.graphicalStyle}`)}
                      </div>
                    )}
                    {story.storyLanguage && (
                      <div className="badge badge-accent badge-xs">
                        {t(`storyLanguage.${story.storyLanguage}`)}
                      </div>
                    )}
                  </div>

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
                {hasActiveFilters 
                  ? 'No stories match your filters' 
                  : t('gallery.emptyTitle', { default: 'No Featured Stories Yet' })
                }
              </h3>
              <p className="text-gray-600 mb-8">
                {hasActiveFilters 
                  ? 'Try adjusting your filters to see more stories.'
                  : t('gallery.emptyMessage', { default: 'Create your own story and share it with the world!' })
                }
              </p>
              {hasActiveFilters ? (
                <button 
                  onClick={clearAllFilters}
                  className="btn btn-secondary"
                >
                  {t('filters.clearAll')}
                </button>
              ) : (
                <Link 
                  href={`/${locale}/dashboard`}
                  className="btn btn-primary"
                >
                  {t('gallery.createStory', { default: 'Create Your Story' })}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
