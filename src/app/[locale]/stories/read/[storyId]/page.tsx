'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiVolume2, FiEdit3, FiShare2, FiArrowLeft, FiPrinter, FiBook } from 'react-icons/fi';
import { trackStoryManagement } from '../../../../../lib/analytics';
import StoryReader from '../../../../../components/StoryReader';
import StoryRating from '../../../../../components/StoryRating';
import ShareModal from '../../../../../components/ShareModal';

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  imageUri: string | null;
  imageThumbnailUri: string | null;
  htmlContent: string;
  audioUri: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Story {
  title: string;
  authorName: string;
  dedicationMessage?: string;
  targetAudience?: string;
  graphicalStyle?: string;
  coverUri?: string;
  backcoverUri?: string;
}

export default function ReadStoryPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const storyId = params.storyId as string;
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}/chapters`);
        if (response.ok) {
          const data = await response.json();
          setStory(data.story);
          setChapters(data.chapters);

          // Track story viewing
          trackStoryManagement.viewed({
            story_id: storyId,
            story_title: data.story.title,
            story_status: 'published',
            target_audience: data.story.targetAudience,
            graphical_style: data.story.graphicalStyle
          });
        } else if (response.status === 404) {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigateToRead = () => {
    // Already on read page, do nothing
    return;
  };

  const navigateToEdit = () => {
    router.push(`/${locale}/stories/edit/${storyId}`);
  };

  const navigateToMyStories = () => {
    router.push(`/${locale}/my-stories`);
  };

  const handlePrint = () => {
    router.push(`/${locale}/stories/print/${storyId}`);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p className="text-lg">{tCommon('Loading.default')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-3xl font-bold mb-4">{tCommon('Errors.oops')}</h1>
          <p className="text-lg mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="btn btn-primary"
          >
            {tCommon('Actions.goBack')}
          </button>
        </div>
      </div>
    );
  }

  if (!story || chapters.length === 0) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">{tCommon('Errors.noChaptersFound')}</h1>
          <p className="text-lg mb-6">{tCommon('Errors.noChaptersFoundDesc')}</p>
          <button
            onClick={() => router.push(`/${locale}/my-stories`)}
            className="btn btn-primary"
          >
            {tCommon('Actions.backToMyStories')}
          </button>
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
        {/* Action Bar */}
        <div className="bg-base-200 border-b border-base-300 p-4 print:hidden">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              onClick={navigateToMyStories}
              className="btn btn-ghost btn-sm"
            >
              <FiArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{tCommon('Actions.backToMyStories')}</span>
            </button>
            
            <div className="flex items-center gap-2">
              <button
                className="btn btn-ghost btn-sm btn-active"
              >
                <FiBook className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tCommon('Actions.read')}</span>
              </button>
              
              <button
                onClick={navigateToListen}
                className="btn btn-ghost btn-sm"
              >
                <FiVolume2 className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tCommon('Actions.listen')}</span>
              </button>
              
              <button
                onClick={navigateToEdit}
                className="btn btn-ghost btn-sm"
              >
                <FiEdit3 className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tCommon('Actions.edit')}</span>
              </button>
              
              <button
                onClick={handlePrint}
                className="btn btn-ghost btn-sm"
              >
                <FiPrinter className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tCommon('Actions.print')}</span>
              </button>
              
              <button
                onClick={handleShare}
                className="btn btn-ghost btn-sm"
              >
                <FiShare2 className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tCommon('Actions.share')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Story Reader - First page with cover and table of contents */}
        <StoryReader
          storyId={storyId}
          story={story}
          chapters={chapters}
          currentChapter={0} // 0 = first page
        />

        {/* Story Rating */}
        <div className="max-w-4xl mx-auto p-4 print:hidden">
          <StoryRating storyId={storyId} />
        </div>

        {/* Share Modal */}
        <ShareModal
          storyId={storyId}
          storyTitle={story.title}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      </SignedIn>

      <SignedOut>
        <div className="min-h-screen bg-base-100 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold mb-4">{tCommon('Errors.authRequired')}</h1>
            <p className="text-lg mb-6">{tCommon('Errors.pleaseSignIn')}</p>
            <button
              onClick={() => router.push(`/${locale}/sign-in`)}
              className="btn btn-primary"
            >
              {tCommon('Actions.signIn')}
            </button>
          </div>
        </div>
      </SignedOut>
    </div>
  );
}
