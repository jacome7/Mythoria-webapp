'use client';

import { useState, useEffect, useMemo } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  FiBook,
  FiVolume2,
  FiEdit3,
  FiShare2,
  FiArrowLeft,
  FiCreditCard,
  FiLoader,
  FiPrinter,
  FiCopy,
  FiDownload,
} from 'react-icons/fi';
import ToastContainer from '../../../../../components/ToastContainer';
import { useToast } from '@/hooks/useToast';
import ShareModal from '../../../../../components/ShareModal';
import {
  useAudioPlayer,
  AudioChapterList,
  hasAudiobook,
  getAudioChapters,
} from '@/components/AudioPlayer';
import { SelfPrintModal } from '../../../../../components/self-print/SelfPrintModal';
import { getAvailableVoices, getDefaultVoice } from '@/lib/voice-options';

interface Story {
  storyId: string;
  title: string;
  status: 'draft' | 'writing' | 'published';
  audiobookUri?:
    | Array<{
        chapterTitle: string;
        audioUri: string;
        duration: number;
        imageUri?: string;
      }>
    | Record<string, string>;
  targetAudience?: string;
  graphicalStyle?: string;
  createdAt: string;
  updatedAt: string;
}

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

interface UserCredits {
  currentBalance: number;
  creditHistory: Array<{
    id: string;
    amount: number;
    description: string;
    transactionType: string;
    createdAt: string;
    balanceAfter: number;
  }>;
}

interface AudiobookCost {
  credits: number;
  name: string;
  description: string;
}

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  voiceOptions: Array<{ value: string; label: string }>;
  tVoices: (key: string) => string;
}

function VoiceSelector({
  selectedVoice,
  onVoiceChange,
  voiceOptions,
  tVoices,
}: VoiceSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-medium">{tVoices('selectVoice')}</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={selectedVoice}
          onChange={(e) => onVoiceChange(e.target.value)}
        >
          {voiceOptions.map((voice) => (
            <option key={voice.value} value={voice.value}>
              {voice.label}
            </option>
          ))}
        </select>
      </div>

      {selectedVoice && (
        <div className="alert alert-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span className="text-sm">{tVoices(`descriptions.${selectedVoice.toLowerCase()}`)}</span>
        </div>
      )}
    </div>
  );
}

export default function ListenStoryPage() {
  const router = useRouter();
  const params = useParams<{ storyId?: string }>();
  const locale = useLocale();
  const tVoices = useTranslations('Voices');
  const tErrors = useTranslations('Errors');
  const tListenStory = useTranslations('ListenStory');
  const tActions = useTranslations('Actions');
  const tCreditsDisplay = useTranslations('CreditsDisplay');
  const tDeliveryOptions = useTranslations('DeliveryOptions');
  const storyId = (params?.storyId as string | undefined) ?? '';
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSelfPrintModal, setShowSelfPrintModal] = useState(false);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [audiobookCost, setAudiobookCost] = useState<AudiobookCost | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioGenerationProgress, setAudioGenerationProgress] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>(getDefaultVoice());
  const [includeBackgroundMusic, setIncludeBackgroundMusic] = useState(true);
  const { toasts, removeToast, successWithAction, error: toastError } = useToast();

  // Initialize audio player hook
  const audioPlayer = useAudioPlayer({
    audioEndpoint: `/api/stories/${storyId}/audio`,
    // Remove onError callback to prevent page crashes - let audio player handle errors internally
    onError: undefined,
    trackingData: {
      story_id: storyId,
      story_title: story?.title,
    },
  });

  // Voice options for narration - based on configured TTS provider
  const voiceOptions = useMemo(() => {
    const voices = getAvailableVoices();
    return voices.map((voice) => ({
      value: voice.value,
      label: tVoices(voice.labelKey),
    }));
  }, [tVoices]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch story, user credits, and audiobook pricing in parallel
        const [storyResponse, creditsResponse, pricingResponse] = await Promise.all([
          fetch(`/api/stories/${storyId}`),
          fetch('/api/my-credits'),
          fetch('/api/pricing'),
        ]);

        // Handle story
        if (storyResponse.ok) {
          const storyData = await storyResponse.json();
          console.log('Fetched story data:', storyData);

          if (storyData.story.status !== 'published') {
            setError(tErrors('storyNotAvailableYet'));
            return;
          }
          setStory(storyData.story);

          // Set chapters data if available
          if (storyData.chapters) {
            setChapters(storyData.chapters);
          } else {
            console.log('No chapters data in API response');
          }
        } else if (storyResponse.status === 404) {
          setError(tErrors('storyNotFoundGeneric'));
          return;
        } else if (storyResponse.status === 403) {
          setError(tErrors('noPermission'));
          return;
        } else {
          setError(tErrors('failedToLoad'));
          return;
        }

        // Handle credits
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          setUserCredits(creditsData);
        }

        // Handle pricing
        if (pricingResponse.ok) {
          const pricingData = await pricingResponse.json();
          if (pricingData.success && pricingData.deliveryOptions?.audiobook) {
            setAudiobookCost(pricingData.deliveryOptions.audiobook);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(tErrors('failedToLoad'));
      } finally {
        setLoading(false);
      }
    };

    if (storyId) {
      fetchInitialData();
    }
  }, [storyId, tErrors]);

  // Poll for audiobook updates when generating
  useEffect(() => {
    if (!isGeneratingAudio) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.story.audiobookUri) {
            // Check if we now have audiobook
            const tempStory = data.story;
            if (Array.isArray(tempStory.audiobookUri) && tempStory.audiobookUri.length > 0) {
              setStory(tempStory);
              // Update chapters if available
              if (data.chapters) {
                setChapters(data.chapters);
              }
              setIsGeneratingAudio(false);
              setAudioGenerationProgress(tListenStory('generationCompleted'));
              clearInterval(pollInterval);
            } else if (
              typeof tempStory.audiobookUri === 'object' &&
              Object.keys(tempStory.audiobookUri).length > 0
            ) {
              setStory(tempStory);
              // Update chapters if available
              if (data.chapters) {
                setChapters(data.chapters);
              }
              setIsGeneratingAudio(false);
              setAudioGenerationProgress(tListenStory('generationCompleted'));
              clearInterval(pollInterval);
            }
          }
        }
      } catch (error) {
        console.error('Error polling for audiobook updates:', error);
      }
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(pollInterval);
  }, [isGeneratingAudio, storyId, tListenStory]);
  const handleGenerateAudiobook = async () => {
    try {
      setIsGeneratingAudio(true);
      setAudioGenerationProgress(tListenStory('startingGeneration'));

      const response = await fetch(`/api/stories/${storyId}/generate-audiobook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice: selectedVoice,
          includeBackgroundMusic,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setAudioGenerationProgress(tListenStory('generationStarted'));

        // Update user credits if provided
        if (result.newBalance !== undefined && userCredits) {
          setUserCredits((prev) => (prev ? { ...prev, currentBalance: result.newBalance } : prev));
        }

        // Start polling for updates
      } else {
        const errorData = await response.json();
        if (response.status === 402) {
          // Insufficient credits
          throw new Error(
            tListenStory('needMoreCreditsGenerate', { shortfall: errorData.shortfall }),
          );
        } else {
          throw new Error(errorData.error || tListenStory('generationFailed'));
        }
      }
    } catch (error) {
      console.error('Error generating audiobook:', error);
      setIsGeneratingAudio(false);
      setAudioGenerationProgress('');

      if (error instanceof Error) {
        alert(tErrors('failedToStartAudiobook') + ': ' + error.message);
      } else {
        alert(tErrors('failedToStartAudiobook') + '. ' + tListenStory('tryAgainLater'));
      }
    }
  };

  const navigateToRead = () => {
    router.push(`/${locale}/stories/read/${storyId}`);
  };

  const navigateToListen = () => {
    // Already on listen page, do nothing
    return;
  };

  const navigateToEdit = () => {
    router.push(`/${locale}/stories/edit/${storyId}`);
  };

  const navigateToPrint = () => {
    router.push(`/${locale}/stories/print/${storyId}`);
  };

  const navigateToPricing = () => {
    router.push(`/${locale}/pricing`);
  };

  const handleDownload = () => {
    setShowSelfPrintModal(true);
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
      successWithAction(
        tActions('duplicateSuccess', { default: 'Story duplicated successfully' }),
        tActions('open'),
        link,
      );
    } catch (e) {
      console.error('Error duplicating story:', e);
      toastError(tActions('tryAgain'));
    }
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
            <h1 className="text-4xl font-bold">{tListenStory('accessRestricted')}</h1>
            <p className="text-lg text-gray-600">{tListenStory('needSignInToListen')}</p>
            <div className="space-x-4">
              <button onClick={() => router.push(`/${locale}/sign-in`)} className="btn btn-primary">
                {tActions('signIn')}
              </button>
              <button onClick={() => router.push(`/${locale}/sign-up`)} className="btn btn-outline">
                {tActions('createAccount')}
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
              <button
                onClick={() => router.push(`/${locale}/my-stories`)}
                className="btn btn-primary"
              >
                {tActions('backToMyStories')}
              </button>
            </div>
          </div>
        ) : story ? (
          <div>
            {/* Action Bar */}
            <div className="bg-base-200 border-b border-base-300 p-4 print:hidden">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <button
                  onClick={() => router.push(`/${locale}/my-stories`)}
                  className="btn btn-ghost btn-sm"
                >
                  <FiArrowLeft className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{tActions('backToMyStories')}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button onClick={navigateToRead} className="btn btn-ghost btn-sm">
                    <FiBook className="w-4 h-4" />
                    <span className="hidden sm:inline sm:ml-2">{tActions('read')}</span>
                  </button>

                  <button className="btn btn-ghost btn-sm btn-active">
                    <FiVolume2 className="w-4 h-4" />
                    <span className="hidden sm:inline sm:ml-2">{tActions('listen')}</span>
                  </button>

                  <button onClick={navigateToEdit} className="btn btn-ghost btn-sm">
                    <FiEdit3 className="w-4 h-4" />
                    <span className="hidden sm:inline sm:ml-2">{tActions('edit')}</span>
                  </button>

                  <button onClick={navigateToPrint} className="btn btn-ghost btn-sm">
                    <FiPrinter className="w-4 h-4" />
                    <span className="hidden sm:inline sm:ml-2">{tActions('print')}</span>
                  </button>

                  <button onClick={handleDownload} className="btn btn-ghost btn-sm">
                    <FiDownload className="w-4 h-4" />
                    <span className="hidden sm:inline sm:ml-2">{tActions('downloadPdf')}</span>
                  </button>

                  <button onClick={() => setShowShareModal(true)} className="btn btn-ghost btn-sm">
                    <FiShare2 className="w-4 h-4" />
                    <span className="hidden sm:inline sm:ml-2">{tActions('share')}</span>
                  </button>

                  <button onClick={handleDuplicate} className="btn btn-ghost btn-sm">
                    <FiCopy className="w-4 h-4" />
                    <span className="hidden sm:inline sm:ml-2">{tActions('duplicate')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Audio Listening Content */}
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h2 className="card-title text-2xl mb-6">
                      <FiVolume2 className="w-6 h-6 mr-2" />
                      {tListenStory('listenToStory', { title: story.title })}
                    </h2>

                    {hasAudiobook(story.audiobookUri) ? (
                      <div className="space-y-6">
                        {/* Audiobook Chapters */}
                        <AudioChapterList
                          chapters={getAudioChapters(story.audiobookUri, chapters, (number) =>
                            tListenStory('chapterTitle', { number }),
                          )}
                          {...audioPlayer}
                        />

                        {/* Re-narrate Section */}
                        <div className="divider"></div>
                        <div className="card bg-base-200 shadow-md">
                          <div className="card-body">
                            <div className="text-center space-y-4">
                              <h3 className="card-title text-lg mb-4 justify-center">
                                <FiVolume2 className="w-5 h-5 mr-2" />
                                {tListenStory('wantNewNarration')}
                              </h3>
                              <p className="text-base-content/70 mb-4">
                                {tListenStory('newNarrationDescription')}
                              </p>

                              {audiobookCost && userCredits && (
                                <div className="space-y-6 max-w-md mx-auto">
                                  {/* Voice Selection */}
                                  <VoiceSelector
                                    selectedVoice={selectedVoice}
                                    onVoiceChange={setSelectedVoice}
                                    voiceOptions={voiceOptions}
                                    tVoices={tVoices}
                                  />

                                  {/* Background Music Toggle */}
                                  <div className="form-control">
                                    <label className="label cursor-pointer justify-center gap-3">
                                      <span className="label-text font-medium">
                                        {tListenStory('includeBackgroundMusic')}
                                      </span>
                                      <input
                                        type="checkbox"
                                        className="toggle toggle-primary"
                                        checked={includeBackgroundMusic}
                                        onChange={(e) =>
                                          setIncludeBackgroundMusic(e.target.checked)
                                        }
                                      />
                                    </label>
                                    <p className="text-sm text-base-content/60 text-center">
                                      {tListenStory('backgroundMusicDescription')}
                                    </p>
                                  </div>

                                  <div className="stats stats-horizontal shadow">
                                    <div className="stat">
                                      <div className="stat-title">{tListenStory('cost')}</div>
                                      <div className="stat-value text-lg">
                                        {audiobookCost.credits} {tCreditsDisplay('credits')}
                                      </div>
                                    </div>
                                    <div className="stat">
                                      <div className="stat-title">
                                        {tListenStory('yourBalance')}
                                      </div>
                                      <div className="stat-value text-lg">
                                        {userCredits.currentBalance} {tCreditsDisplay('credits')}
                                      </div>
                                    </div>
                                  </div>

                                  {userCredits.currentBalance >= audiobookCost.credits ? (
                                    <div className="space-y-2">
                                      <button
                                        onClick={handleGenerateAudiobook}
                                        className="btn btn-secondary btn-wide"
                                        disabled={isGeneratingAudio}
                                      >
                                        <FiVolume2 className="w-4 h-4 mr-2" />
                                        {tListenStory('narrateStoryAgain')}
                                      </button>
                                      <p className="text-sm text-base-content/60">
                                        {tListenStory('replaceCurrentNarration')}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="alert alert-warning">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="stroke-current shrink-0 h-6 w-6"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                          />
                                        </svg>
                                        <span>
                                          {tListenStory('needMoreCredits', {
                                            credits:
                                              audiobookCost.credits - userCredits.currentBalance,
                                          })}
                                        </span>
                                      </div>
                                      <button
                                        onClick={navigateToPricing}
                                        className="btn btn-secondary btn-wide"
                                      >
                                        <FiCreditCard className="w-4 h-4 mr-2" />
                                        {tListenStory('buyMoreCredits')}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {(!audiobookCost || !userCredits) && (
                                <div className="alert alert-info max-w-md mx-auto">
                                  <span className="loading loading-spinner loading-sm"></span>
                                  <span>{tListenStory('loadingPricing')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : isGeneratingAudio ? (
                      <div className="text-center py-16">
                        <FiLoader className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
                        <h3 className="text-xl font-semibold mb-2">
                          {tListenStory('generatingAudiobook')}
                        </h3>
                        <p className="text-base-content/70 mb-4">{audioGenerationProgress}</p>
                        <div className="max-w-md mx-auto">
                          <div className="alert alert-info">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              className="stroke-current shrink-0 w-6 h-6"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              ></path>
                            </svg>
                            <span className="text-sm">{tListenStory('checkingUpdates')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <FiVolume2 className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
                        <h3 className="text-xl font-semibold mb-2">
                          {tListenStory('convertYourStory')}
                        </h3>
                        <p className="text-lg text-base-content/70 mb-6">
                          {tListenStory('convertDescription')}
                        </p>

                        {/* Show pricing and action */}
                        {audiobookCost && userCredits && (
                          <div className="max-w-md mx-auto space-y-6">
                            {/* Voice Selection */}
                            <VoiceSelector
                              selectedVoice={selectedVoice}
                              onVoiceChange={setSelectedVoice}
                              voiceOptions={voiceOptions}
                              tVoices={tVoices}
                            />

                            {/* Background Music Toggle */}
                            <div className="form-control">
                              <label className="label cursor-pointer justify-center gap-3">
                                <span className="label-text font-medium">
                                  {tListenStory('includeBackgroundMusic')}
                                </span>
                                <input
                                  type="checkbox"
                                  className="toggle toggle-primary"
                                  checked={includeBackgroundMusic}
                                  onChange={(e) => setIncludeBackgroundMusic(e.target.checked)}
                                />
                              </label>
                              <p className="text-sm text-base-content/60 text-center">
                                {tListenStory('backgroundMusicDescription')}
                              </p>
                            </div>

                            <div className="card bg-base-200 shadow-md">
                              <div className="card-body p-4">
                                <h4 className="font-semibold">
                                  {tDeliveryOptions('audiobook.name')}
                                </h4>
                                <p className="text-sm text-base-content/70 mb-2">
                                  {tDeliveryOptions('audiobook.description')}
                                </p>
                                <div className="flex justify-between items-center">
                                  <span className="text-lg font-bold">
                                    {audiobookCost.credits} {tCreditsDisplay('credits')}
                                  </span>
                                  <span className="text-sm text-base-content/60">
                                    {tCreditsDisplay('currentBalance')} {userCredits.currentBalance}{' '}
                                    {tCreditsDisplay('credits')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {userCredits.currentBalance >= audiobookCost.credits ? (
                              <button
                                onClick={handleGenerateAudiobook}
                                className="btn btn-primary btn-lg w-full"
                                disabled={isGeneratingAudio}
                              >
                                <FiVolume2 className="w-5 h-5 mr-2" />
                                {tListenStory('narrateYourStory')}
                              </button>
                            ) : (
                              <div className="space-y-2">
                                <div className="alert alert-warning">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="stroke-current shrink-0 h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                  </svg>
                                  <span>
                                    {tListenStory('needMoreCredits', {
                                      credits: audiobookCost.credits - userCredits.currentBalance,
                                    })}
                                  </span>
                                </div>
                                <button
                                  onClick={navigateToPricing}
                                  className="btn btn-secondary btn-lg w-full"
                                >
                                  <FiCreditCard className="w-5 h-5 mr-2" />
                                  {tListenStory('buyMoreCredits')}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {(!audiobookCost || !userCredits) && (
                          <div className="max-w-md mx-auto">
                            <div className="alert alert-info">
                              <span className="loading loading-spinner loading-sm"></span>
                              <span>{tListenStory('loadingPricing')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
          onShareSuccess={(shareData) => {
            console.log('Share successful:', shareData);
          }}
        />
      )}

      {story && (
        <SelfPrintModal
          isOpen={showSelfPrintModal}
          storyId={story.storyId}
          storyTitle={story.title}
          onClose={() => setShowSelfPrintModal(false)}
        />
      )}
      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
