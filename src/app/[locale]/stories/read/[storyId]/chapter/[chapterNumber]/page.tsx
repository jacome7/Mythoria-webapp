'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiVolume2, FiEdit3, FiShare2, FiArrowLeft, FiPrinter } from 'react-icons/fi';
import { trackStoryManagement } from '../../../../../../../lib/analytics';
import StoryReader from '../../../../../../../components/StoryReader';
import StoryRating from '../../../../../../../components/StoryRating';
import ShareModal from '../../../../../../../components/ShareModal';

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

export default function ReadChapterPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const storyId = params.storyId as string;
  const chapterNumber = parseInt(params.chapterNumber as string);
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}/chapters/${chapterNumber}`);
        if (response.ok) {
          const data = await response.json();
          setStory(data.story);
          setChapters(data.chapters);
          setCurrentChapter(data.currentChapter);

          // Track story viewing
          trackStoryManagement.viewed({
            story_id: storyId,
            story_title: data.story.title,
            story_status: 'published',
            target_audience: data.story.targetAudience,
            graphical_style: data.story.graphicalStyle,
            chapter_number: chapterNumber
          });
        } else if (response.status === 404) {
          setError(tCommon('Errors.storyNotFoundGeneric'));
        } else if (response.status === 403) {
          setError(tCommon('Errors.noPermission'));
        } else {
          setError(tCommon('Errors.failedToLoad'));
        }
      } catch (error) {
        console.error('Error fetching story chapter:', error);
        setError(tCommon('Errors.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };

    if (storyId && chapterNumber) {
      fetchChapter();
    }
  }, [storyId, chapterNumber, tCommon]);

  const navigateToListen = () => {
    router.push(`/${locale}/stories/listen/${storyId}`);
  };

  const navigateToEdit = () => {
    router.push(`/${locale}/stories/edit/${storyId}/chapter/${chapterNumber}`);
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

  if (!story || !currentChapter) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-3xl font-bold mb-4">{tCommon('Errors.chapterNotFound')}</h1>
          <p className="text-lg mb-6">{tCommon('Errors.chapterNotFoundDesc')}</p>
          <button
            onClick={() => router.push(`/${locale}/stories/read/${storyId}`)}
            className="btn btn-primary"
          >
            {tCommon('Actions.backToStory')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
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

        {/* Story Reader */}
        <StoryReader
          storyId={storyId}
          story={story}
          chapters={chapters}
          currentChapter={chapterNumber}
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
