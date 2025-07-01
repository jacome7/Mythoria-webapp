'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiLoader, FiAlertCircle, FiUser, FiCalendar, FiTag, FiEye, FiPrinter } from 'react-icons/fi';
import StoryReader from '@/components/StoryReader';
import PublicStoryRating from '@/components/PublicStoryRating';
import StoryAudioPlayer from '@/components/StoryAudioPlayer';

interface PublicStoryData {
  success: boolean;
  story: {
    storyId: string;
    title: string;
    synopsis?: string;
    htmlUri?: string;
    pdfUri?: string;
    audiobookUri?: Array<{
      chapterTitle: string;
      audioUri: string;
      duration: number;
      imageUri?: string;
    }> | Record<string, string>;
    targetAudience?: string;
    graphicalStyle?: string;
    novelStyle?: string;
    plotDescription?: string;
    createdAt: string;
    isPublic: boolean;
    author: {
      displayName: string;
    };
  };
  accessLevel: 'public';
  error?: string;
}

export default function PublicStoryPage() {
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations('PublicStoryPage');
  const tCommon = useTranslations('common');
  const slug = params.slug as string;
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicStoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storyContent, setStoryContent] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;    const fetchPublicStory = async () => {
      try {
        console.log('[Public Page] Fetching story for slug:', slug);
        const response = await fetch(`/api/public/${slug}`);
        console.log('[Public Page] Response status:', response.status);
        console.log('[Public Page] Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Public Page] Response error:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('[Public Page] Response data:', result);        if (result.success) {
          setData(result);
          
          // Fetch story content through our proxy API to avoid CORS issues
          if (result.story.htmlUri) {
            try {
              console.log('[Public Page] Fetching content through proxy API...');
              const contentResponse = await fetch(`/api/public/${slug}/content`);
              if (contentResponse.ok) {
                const htmlContent = await contentResponse.text();
                console.log('[Public Page] Content fetched successfully, length:', htmlContent.length);
                setStoryContent(htmlContent);
              } else {
                console.error('[Public Page] Failed to fetch content through proxy:', contentResponse.status);
                setError('Failed to load story content');
              }
            } catch (err) {
              console.error('Error fetching story content through proxy:', err);
              setError('Failed to load story content');
            }
          } else {
            console.log('[Public Page] No HTML URI available');
            setError('Story content not available');
          }} else {
          console.error('[Public Page] API returned error:', result.error);
          setError(result.error || 'Story not found');
        }      } catch (err) {
        console.error('[Public Page] Error fetching public story:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load story: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicStory();
  }, [slug]);
  // Generate metadata for the page
  useEffect(() => {
    if (data?.story) {
      const story = data.story;
      document.title = `${story.title} | Mythoria`;
      
      // Set meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      const description = story.synopsis || story.plotDescription || `Read "${story.title}" on Mythoria`;
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = description;
        document.head.appendChild(meta);
      }

      // Set Open Graph tags
      const setMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      const baseUrl = window.location.origin;
      setMetaTag('og:title', story.title);
      setMetaTag('og:description', description);
      setMetaTag('og:type', 'article');
      setMetaTag('og:url', window.location.href);
      setMetaTag('og:site_name', 'Mythoria');
      setMetaTag('og:image', `${baseUrl}/api/og/story/${slug}`);
      setMetaTag('og:image:width', '1200');
      setMetaTag('og:image:height', '630');
      setMetaTag('og:image:alt', `Cover image for "${story.title}"`);

      // Twitter Card tags
      const setTwitterTag = (name: string, content: string) => {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', name);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      setTwitterTag('twitter:card', 'summary_large_image');
      setTwitterTag('twitter:title', story.title);
      setTwitterTag('twitter:description', description);
      setTwitterTag('twitter:image', `${baseUrl}/api/og/story/${slug}`);
    }
  }, [data, slug]);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <FiLoader className="animate-spin text-4xl text-primary mx-auto" />
          <h2 className="text-xl font-semibold">{t('loading.title')}</h2>
          <p className="text-gray-600">{t('loading.subtitle')}</p>
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <FiAlertCircle className="text-4xl text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">{t('errors.notFound')}</h2>
          <p className="text-gray-600">{error || t('errors.notFoundDesc')}</p>
          
          <div className="space-y-2">
            <a
              href={`/${locale}`}
              className="btn btn-primary btn-sm"
            >
              {tCommon('Actions.goToHomepage')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { story } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col gap-4">
              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-900">{story.title}</h1>
              
              {/* Actions - Mobile responsive layout */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Tags and Print Button */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-success text-xs sm:text-sm">{t('labels.publicStory')}</span>
                  <a
                    href={`/${locale}/stories/print/${story.storyId}`}
                    className="btn btn-primary btn-sm flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <FiPrinter className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden min-[480px]:inline">{t('actions.orderPrint')}</span>
                    <span className="min-[480px]:hidden">Print</span>
                  </a>
                </div>
                
                {/* Audio Player */}
                {story.audiobookUri && (
                  <StoryAudioPlayer
                    audiobookUri={story.audiobookUri}
                    storyId={story.storyId}
                    storyTitle={story.title}
                    isPublic={true}
                  />
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-4">
              <div className="flex items-center gap-1">
                <FiUser />
                <span>{t('labels.by')} {story.author.displayName}</span>
              </div>
                <div className="flex items-center gap-1">
                <FiCalendar />
                <span>{new Date(story.createdAt).toLocaleDateString(locale)}</span>
              </div>              
              {story.targetAudience && (
                <div className="flex items-center gap-1">
                  <FiTag />
                  <span>{story.targetAudience.replace('_', ' ')}</span>
                </div>
              )}              {story.graphicalStyle && (
                <div className="flex items-center gap-1">
                  <FiEye />
                  <span className="capitalize">{story.graphicalStyle.replace('_', ' ')}</span>
                </div>
              )}
              
              {story.novelStyle && (
                <div className="flex items-center gap-1">
                  <FiTag />
                  <span className="capitalize">{story.novelStyle.replace('_', ' ')}</span>
                </div>
              )}
            </div>            {(story.synopsis || story.plotDescription) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-2">{t('labels.synopsis')}</h3>
                <p className="text-gray-700 leading-relaxed text-sm">
                  {story.synopsis || story.plotDescription}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>      {/* Story Content */}
      <div className="py-8">
        {storyContent ? (
          <div className="w-full md:container md:mx-auto md:px-4">
            <div className="md:max-w-4xl md:mx-auto">
              <div className="bg-white md:rounded-lg md:shadow-sm md:border">
                <StoryReader 
                  storyContent={storyContent}
                  storyMetadata={{
                    targetAudience: story.targetAudience,
                    graphicalStyle: story.graphicalStyle,
                    title: story.title
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <FiAlertCircle className="text-4xl text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('errors.contentNotAvailable')}</h3>
                <p className="text-gray-600">
                  {t('errors.contentNotAvailableDesc')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Story Rating Section */}
        <div className="container mx-auto px-4 mt-8">
          <div className="max-w-4xl mx-auto">
            <PublicStoryRating
              storyId={story.storyId}
              onRatingSubmitted={(rating) => {
                console.log('Rating submitted:', rating);
              }}
            />
          </div>
        </div>
      </div>

      {/* Custom CSS for responsive design */}
      <style jsx>{`
        @media (max-width: 480px) {
          .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }
          
          .badge {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
