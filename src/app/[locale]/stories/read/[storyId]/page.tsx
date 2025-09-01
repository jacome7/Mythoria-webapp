'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiVolume2, FiEdit3, FiShare2, FiArrowLeft, FiPrinter, FiBook, FiCopy } from 'react-icons/fi';
import { trackStoryManagement } from '../../../../../lib/analytics';
import StoryReader from '../../../../../components/StoryReader';
import StoryRating from '../../../../../components/StoryRating';
import ShareModal from '../../../../../components/ShareModal';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '../../../../../components/ToastContainer';

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
  status?: 'draft' | 'writing' | 'published';
}

export default function ReadStoryPage() {
  const router = useRouter();
  const params = useParams<{ storyId?: string }>();
  const locale = useLocale();
  const tLoading = useTranslations('Loading');
  const tErrors = useTranslations('Errors');
  const tActions = useTranslations('Actions');
  const tMyStories = useTranslations('MyStoriesPage');
  const tAuth = useTranslations('Auth');
  const storyId = (params?.storyId as string | undefined) ?? '';
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const { toasts, successWithAction, error: toastError, removeToast } = useToast();

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
          setLoadError(tErrors('storyNotFoundGeneric'));
        } else if (response.status === 403) {
          setLoadError(tErrors('noPermission'));
        } else {
          setLoadError(tErrors('failedToLoad'));
        }
      } catch (error) {
        console.error('Error fetching story:', error);
        setLoadError(tErrors('failedToLoad'));
      } finally {
        setLoading(false);
      }
    };

    if (storyId) {
      fetchStory();
    }
  }, [storyId, tErrors]);

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

  const handleDuplicate = async () => {
    try {
      const resp = await fetch(`/api/my-stories/${storyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
  // Do not send locale when duplicating; language remains original.
  body: JSON.stringify({ action: 'duplicate' }),
      });
      if (!resp.ok) throw new Error(`Duplicate failed: ${resp.status}`);
      const data = await resp.json();
      const newId = data?.story?.storyId || data?.storyId;
      const link = `/${locale}/stories/read/${newId}`;
      // localized message comes from MyStoriesPage duplicate.success for consistency
      successWithAction(
        tMyStories('duplicate.success'),
        tActions('open'),
        link
      );
    } catch (e) {
      console.error(e);
      toastError(tActions('tryAgain'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p className="text-lg">{tLoading('default')}</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-3xl font-bold mb-4">{tErrors('oops')}</h1>
          <p className="text-lg mb-6">{loadError}</p>
          <button
            onClick={() => router.back()}
            className="btn btn-primary"
          >
            {tActions('goBack')}
          </button>
        </div>
      </div>
    );
  }

  if (!story || chapters.length === 0) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">{tErrors('noChaptersFound')}</h1>
          <p className="text-lg mb-6">{tErrors('noChaptersFoundDesc')}</p>
          <button
            onClick={() => router.push(`/${locale}/my-stories`)}
            className="btn btn-primary"
          >
            {tActions('backToMyStories')}
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
            <h1 className="text-4xl font-bold">{tAuth('accessRestricted')}</h1>
            <p className="text-lg text-gray-600">
              {tAuth('needSignIn')}
            </p>
            <div className="space-x-4">
              <button
                onClick={() => router.push(`/${locale}/sign-in`)}
                className="btn btn-primary"
              >
                {tAuth('signIn')}
              </button>
              <button
                onClick={() => router.push(`/${locale}/sign-up`)}
                className="btn btn-outline"
              >
                {tAuth('createAccount')}
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
              <span className="hidden sm:inline">{tActions('backToMyStories')}</span>
            </button>
            
            <div className="flex items-center gap-2">
              <button
                className="btn btn-ghost btn-sm btn-active"
              >
                <FiBook className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tActions('read')}</span>
              </button>
              
              <button
                onClick={navigateToListen}
                className="btn btn-ghost btn-sm"
              >
                <FiVolume2 className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tActions('listen')}</span>
              </button>
              
              <button
                onClick={navigateToEdit}
                className="btn btn-ghost btn-sm"
              >
                <FiEdit3 className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tActions('edit')}</span>
              </button>
              
              <button
                onClick={handlePrint}
                className="btn btn-ghost btn-sm"
              >
                <FiPrinter className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tActions('print')}</span>
              </button>
              
              <button
                onClick={handleShare}
                className="btn btn-ghost btn-sm"
              >
                <FiShare2 className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tActions('share')}</span>
              </button>

              <button
                onClick={handleDuplicate}
                className="btn btn-ghost btn-sm"
              >
                <FiCopy className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tActions('duplicate')}</span>
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

  {/* Toasts */}
  <ToastContainer toasts={toasts} onRemove={removeToast} />

      <SignedOut>
        <div className="min-h-screen bg-base-100 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold mb-4">{tErrors('authRequired')}</h1>
            <p className="text-lg mb-6">{tErrors('pleaseSignIn')}</p>
            <button
              onClick={() => router.push(`/${locale}/sign-in`)}
              className="btn btn-primary"
            >
              {tActions('signIn')}
            </button>
          </div>
        </div>
      </SignedOut>
    </div>
  );
}
