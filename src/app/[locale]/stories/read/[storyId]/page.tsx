'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiBook, FiVolume2, FiEdit3, FiShare2, FiArrowLeft, FiPrinter } from 'react-icons/fi';
import { trackStoryManagement } from '../../../../../lib/analytics';
import StoryReader from '../../../../../components/StoryReader';
import StoryRating from '../../../../../components/StoryRating';
import ShareModal from '../../../../../components/ShareModal';

interface Story {
  storyId: string;
  title: string;
  status: 'draft' | 'writing' | 'published';
  htmlUri?: string;
  audiobookUri?: Array<{
    chapterTitle: string;
    audioUri: string;
    duration: number;
    imageUri?: string;
  }>;
  targetAudience?: string;
  graphicalStyle?: string;
  isPublic?: boolean;
  slug?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ReadStoryPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const storyId = params.storyId as string;
  const [story, setStory] = useState<Story | null>(null);
  const [storyContent, setStoryContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (response.ok) {
          const data = await response.json();          // Only allow access to published stories
          if (data.story.status !== 'published') {
            setError(tCommon('Errors.storyNotAvailableYet'));
            return;
          }
          setStory(data.story);

          // Track story viewing
          trackStoryManagement.viewed({
            story_id: data.story.storyId,
            story_title: data.story.title,
            story_status: data.story.status,
            target_audience: data.story.targetAudience,
            graphical_style: data.story.graphicalStyle
          });

          // Use the HTML content from the API response
          if (data.htmlContent) {
            setStoryContent(data.htmlContent);
          } else if (data.story.htmlUri) {
            // Fallback message if content couldn't be fetched
            setStoryContent('<p>Story content is being prepared. Please check back later.</p>');
          } else {
            setStoryContent('<p>Story content is not yet available. The story may still be generating.</p>');
          }        } else if (response.status === 404) {
          setError(tCommon('Errors.storyNotFoundGeneric'));
        } else if (response.status === 403) {
          setError(tCommon('Errors.noPermission'));
        } else {
          setError(tCommon('Errors.failedToLoad'));
        }
      } catch (error) {
        console.error('Error fetching story:', error);
        setError(tCommon('Errors.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };

    if (storyId) {
      fetchStory();
    }
  }, [storyId, tCommon]);

  const navigateToListen = () => {
    router.push(`/${locale}/stories/listen/${storyId}`);
  };

  const navigateToEdit = () => {
    router.push(`/${locale}/stories/edit/${storyId}`);
  };

  const navigateToPrint = () => {
    router.push(`/${locale}/stories/print/${storyId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-96">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <SignedOut>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold">{tCommon('Auth.accessRestricted')}</h1>
            <p className="text-lg text-gray-600">
              {tCommon('Auth.needSignIn')}
            </p>
            <div className="space-x-4">
              <button
                onClick={() => router.push(`/${locale}/sign-in`)}
                className="btn btn-primary"
              >
                {tCommon('Auth.signIn')}
              </button>
              <button
                onClick={() => router.push(`/${locale}/sign-up`)}
                className="btn btn-outline"
              >
                {tCommon('Auth.createAccount')}
              </button>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {error ? (
          <div className="container mx-auto px-4 py-8">
            <div className="text-center space-y-6">
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
              <button
                onClick={() => router.push(`/${locale}/my-stories`)}
                className="btn btn-primary"
              >
                Back to My Stories
              </button>
            </div>
          </div>
        ) : story ? (
          <div className="space-y-6">
            {/* Story Header */}
            <div className="container mx-auto px-4 py-6">
              <div className="text-center space-y-4">
                
                {/* Navigation Buttons */}
                <div className="flex flex-wrap justify-center gap-2">
                  <button className="btn btn-primary">
                    <FiBook className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Reading</span>
                  </button>
                  <button
                    onClick={navigateToListen}
                    className="btn btn-outline btn-primary"
                  >
                    <FiVolume2 className="w-4 h-4" />
                    <span className="hidden md:inline md:ml-2">Listen</span>
                  </button>
                  <button
                    onClick={navigateToEdit}
                    className="btn btn-outline btn-primary"
                  >
                    <FiEdit3 className="w-4 h-4" />
                    <span className="hidden md:inline md:ml-2">Edit</span>
                  </button>
                  <button
                    onClick={navigateToPrint}
                    className="btn btn-outline btn-primary"
                  >
                    <FiPrinter className="w-4 h-4" />
                    <span className="hidden md:inline md:ml-2">Print</span>
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="btn btn-outline btn-primary"
                  >
                    <FiShare2 className="w-4 h-4" />
                    <span className="hidden md:inline md:ml-2">Share</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Story Content */}
            <div>
              <StoryReader
                storyContent={storyContent || ''}
                storyMetadata={{
                  targetAudience: story.targetAudience,
                  graphicalStyle: story.graphicalStyle,
                  title: story.title
                }}
              />

              {/* Story Rating Component */}
              <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                  <StoryRating
                    storyId={storyId}
                    onRatingSubmitted={(rating) => {
                      console.log('Rating submitted:', rating);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Back to Stories Button */}
            <div className="container mx-auto px-4 pb-8">
              <div className="text-center">
                <button
                  onClick={() => router.push(`/${locale}/my-stories`)}
                  className="btn btn-outline"
                >
                  <FiArrowLeft className="w-4 h-4 mr-2" />
                  Back to My Stories
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </SignedIn>
      
      {/* Share Modal */}
      {story && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          storyId={story.storyId}
          storyTitle={story.title}
          isPublic={story.isPublic}
          slug={story.slug}
          onShareSuccess={(shareData) => {
            console.log('Share successful:', shareData);
            // Refresh story data to get updated isPublic status
            if (shareData.success) {
              // Refetch the story data
              const refetchStory = async () => {
                try {
                  const response = await fetch(`/api/stories/${story.storyId}`);
                  if (response.ok) {
                    const updatedStory = await response.json();
                    setStory(updatedStory);
                  }
                } catch (error) {
                  console.error('Error refreshing story:', error);
                }
              };
              refetchStory();
            }
          }}
        />
      )}
    </div>
  );
}
