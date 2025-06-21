'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiBook, FiVolume2, FiEdit3, FiArrowLeft } from 'react-icons/fi';

interface Story {
  storyId: string;
  title: string;
  status: 'draft' | 'writing' | 'published';
  audiobookUri?: Array<{
    chapterTitle: string;
    audioUri: string;
    duration: number;
    imageUri?: string;
  }>;
  targetAudience?: string;
  graphicalStyle?: string;
  createdAt: string;
  updatedAt: string;
}

export default function StoryActionsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations('StoryActionsPage');
  const tCommon = useTranslations('common');
  const storyId = params.storyId as string;
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (response.ok) {
          const data = await response.json();          if (data.story.status !== 'published') {
            setError(tCommon('Errors.storyNotAvailableYet'));
            return;
          }
          setStory(data.story);
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

  const navigateToRead = () => {
    router.push(`/${locale}/stories/read/${storyId}`);
  };

  const navigateToListen = () => {
    router.push(`/${locale}/stories/listen/${storyId}`);
  };

  const navigateToEdit = () => {
    router.push(`/${locale}/stories/edit/${storyId}`);
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
    <div className="min-h-screen bg-base-100">      <SignedOut>
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
              </div>              <button
                onClick={() => router.push(`/${locale}/my-stories`)}
                className="btn btn-primary"
              >
                {tCommon('Actions.backToMyStories')}
              </button>
            </div>
          </div>
        ) : story ? (
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center space-y-8">
                <div className="space-y-4">                  <h1 className="text-4xl font-bold text-primary">{story.title}</h1>                  <p className="text-lg text-base-content/70">
                    {t('description')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Read Story Card */}
                  <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                    <div className="card-body text-center">
                      <div className="flex justify-center mb-4">
                        <FiBook className="w-16 h-16 text-primary" />
                      </div>                      <h2 className="card-title justify-center text-2xl">{t('cards.read.title')}</h2>
                      <p className="text-base-content/70">
                        {t('cards.read.description')}
                      </p>
                      <div className="card-actions justify-center mt-4">
                        <button
                          onClick={navigateToRead}
                          className="btn btn-primary btn-lg"
                        >
                          {tCommon('Actions.startReading')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Listen Story Card */}
                  <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                    <div className="card-body text-center">
                      <div className="flex justify-center mb-4">
                        <FiVolume2 className="w-16 h-16 text-primary" />
                      </div>                      <h2 className="card-title justify-center text-2xl">{t('cards.listen.title')}</h2>
                      <p className="text-base-content/70">
                        {t('cards.listen.description')}
                      </p>
                      <div className="card-actions justify-center mt-4">
                        <button
                          onClick={navigateToListen}
                          className="btn btn-primary btn-lg"
                          disabled={!story?.audiobookUri || story.audiobookUri.length === 0}
                        >
                          {story?.audiobookUri && story.audiobookUri.length > 0 
                            ? tCommon('Actions.startListening')
                            : tCommon('Actions.audioNotAvailable')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Edit Story Card */}
                  <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                    <div className="card-body text-center">
                      <div className="flex justify-center mb-4">
                        <FiEdit3 className="w-16 h-16 text-primary" />
                      </div>                      <h2 className="card-title justify-center text-2xl">{t('cards.edit.title')}</h2>
                      <p className="text-base-content/70">
                        {t('cards.edit.description')}
                      </p>
                      <div className="card-actions justify-center mt-4">
                        <button
                          onClick={navigateToEdit}
                          className="btn btn-primary btn-lg"
                        >
                          {tCommon('Actions.startEditing')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back to Stories Button */}                <div className="pt-8">
                  <button
                    onClick={() => router.push(`/${locale}/my-stories`)}
                    className="btn btn-outline btn-lg"
                  >
                    <FiArrowLeft className="w-5 h-5 mr-2" />
                    {tCommon('Actions.backToMyStories')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </SignedIn>
    </div>
  );
}
