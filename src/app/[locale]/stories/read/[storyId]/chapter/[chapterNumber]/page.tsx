'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiVolume2, FiEdit3, FiShare2, FiArrowLeft, FiPrinter, FiDownload } from 'react-icons/fi';
import StoryReader from '../../../../../../../components/StoryReader';
import StoryRating from '../../../../../../../components/StoryRating';
import ShareModal from '../../../../../../../components/ShareModal';
import { SelfPrintModal } from '../../../../../../../components/self-print/SelfPrintModal';

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
  const params = useParams<{ storyId?: string; chapterNumber?: string }>();
  const locale = useLocale();
  const tLoading = useTranslations('Loading');
  const tErrors = useTranslations('Errors');
  const tActions = useTranslations('Actions');
  const storyId = (params?.storyId as string | undefined) ?? '';
  const chapterNumber = parseInt((params?.chapterNumber as string | undefined) ?? '0', 10);
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSelfPrintModal, setShowSelfPrintModal] = useState(false);

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}/chapters/${chapterNumber}`);
        if (response.ok) {
          const data = await response.json();
          setStory(data.story);
          setChapters(data.chapters);
          setCurrentChapter(data.currentChapter);
        } else if (response.status === 404) {
          setError(tErrors('storyNotFoundGeneric'));
        } else if (response.status === 403) {
          setError(tErrors('noPermission'));
        } else {
          setError(tErrors('failedToLoad'));
        }
      } catch (error) {
        console.error('Error fetching story chapter:', error);
        setError(tErrors('failedToLoad'));
      } finally {
        setLoading(false);
      }
    };

    if (storyId && chapterNumber) {
      fetchChapter();
    }
  }, [storyId, chapterNumber, tErrors]);

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

  const handleDownload = () => {
    setShowSelfPrintModal(true);
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

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-3xl font-bold mb-4">{tErrors('oops')}</h1>
          <p className="text-lg mb-6">{error}</p>
          <button onClick={() => router.back()} className="btn btn-primary">
            {tActions('goBack')}
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
          <h1 className="text-3xl font-bold mb-4">{tErrors('chapterNotFound')}</h1>
          <p className="text-lg mb-6">{tErrors('chapterNotFoundDesc')}</p>
          <button
            onClick={() => router.push(`/${locale}/stories/read/${storyId}`)}
            className="btn btn-primary"
          >
            {tActions('backToStory')}
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
            <button onClick={navigateToMyStories} className="btn btn-ghost btn-sm">
              <FiArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{tActions('backToMyStories')}</span>
            </button>

            <div className="flex items-center gap-2">
              <button onClick={navigateToListen} className="btn btn-ghost btn-sm">
                <FiVolume2 className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tActions('listen')}</span>
              </button>

              <button onClick={navigateToEdit} className="btn btn-ghost btn-sm">
                <FiEdit3 className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tActions('edit')}</span>
              </button>

              <button onClick={handlePrint} className="btn btn-ghost btn-sm">
                <FiPrinter className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tActions('print')}</span>
              </button>

              <button onClick={handleDownload} className="btn btn-ghost btn-sm">
                <FiDownload className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tActions('downloadPdf')}</span>
              </button>

              <button onClick={handleShare} className="btn btn-ghost btn-sm">
                <FiShare2 className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">{tActions('share')}</span>
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

        <SelfPrintModal
          isOpen={showSelfPrintModal}
          storyId={storyId}
          storyTitle={story?.title}
          onClose={() => setShowSelfPrintModal(false)}
        />
      </SignedIn>

      <SignedOut>
        <div className="min-h-screen bg-base-100 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold mb-4">{tErrors('authRequired')}</h1>
            <p className="text-lg mb-6">{tErrors('pleaseSignIn')}</p>
            <button onClick={() => router.push(`/${locale}/sign-in`)} className="btn btn-primary">
              {tActions('signIn')}
            </button>
          </div>
        </div>
      </SignedOut>
    </div>
  );
}
