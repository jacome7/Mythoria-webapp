'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import AudiobookGenerationProgress from '@/components/AudiobookGenerationProgress';

interface AudiobookGenerationTriggerProps {
  storyId: string;
  hasAudiobook: boolean;
  isGenerating?: boolean;
  onGenerationStart?: () => void;
  onGenerationComplete?: () => void;
}

export default function AudiobookGenerationTrigger({
  storyId, 
  hasAudiobook, 
  isGenerating = false,
  onGenerationStart,
  onGenerationComplete
}: AudiobookGenerationTriggerProps) {
  const tAudiobookGenerationTrigger = useTranslations('AudiobookGenerationTrigger');
  const tVoices = useTranslations('Voices');
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(isGenerating);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('nova');

  const handleGenerateAudiobook = async () => {
    setIsGeneratingLocal(true);
    setError(null);
    
    if (onGenerationStart) {
      onGenerationStart();
    }

    try {
      const response = await fetch(`/api/stories/${storyId}/generate-audiobook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice: selectedVoice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || tAudiobookGenerationTrigger('errors.failedToStart'));
      }

      // The response will be 202 Accepted, and the workflow will process asynchronously
      const result = await response.json();
      console.log('Audiobook generation started:', result);
      
      // The progress component will now start polling for updates
      
    } catch (error) {
      console.error('Error generating audiobook:', error);
      setError(
        error instanceof Error ? error.message : tAudiobookGenerationTrigger('errors.failedToStart'),
      );
      setIsGeneratingLocal(false);
    }
  };

  const handleGenerationComplete = () => {
    setIsGeneratingLocal(false);
    if (onGenerationComplete) {
      onGenerationComplete();
    }
  };

  // Voice options for OpenAI TTS
  const voiceOptions = [
    {
      value: 'alloy',
      label: tVoices('names.alloy'),
      description: tVoices('descriptions.alloy'),
    },
    {
      value: 'echo',
      label: tVoices('names.echo'),
      description: tVoices('descriptions.echo'),
    },
    {
      value: 'fable',
      label: tVoices('names.fable'),
      description: tVoices('descriptions.fable'),
    },
    {
      value: 'nova',
      label: tVoices('names.nova'),
      description: tVoices('descriptions.nova'),
    },
    {
      value: 'onyx',
      label: tVoices('names.onyx'),
      description: tVoices('descriptions.onyx'),
    },
    {
      value: 'shimmer',
      label: tVoices('names.shimmer'),
      description: tVoices('descriptions.shimmer'),
    },
  ];

  if (hasAudiobook) {
    return null; // Don't show if audiobook already exists
  }

  if (isGeneratingLocal) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <AudiobookGenerationProgress 
            storyId={storyId} 
            onComplete={handleGenerationComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body text-center">
        <h3 className="card-title justify-center flex items-center gap-2">
          <span className="text-2xl">🎙️</span>
          {tAudiobookGenerationTrigger('generateAudiobook')}
        </h3>
        
        <p className="text-gray-600 mb-6">
          {tAudiobookGenerationTrigger('audiobookDescription')}
        </p>

        {/* Voice Selection */}
        <div className="mb-6">
          <label className="label">
            <span className="label-text font-medium">{tAudiobookGenerationTrigger('selectVoice')}</span>
          </label>
          <select 
            className="select select-bordered w-full max-w-md"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
          >
            {voiceOptions.map((voice) => (
              <option key={voice.value} value={voice.value}>
                {voice.label} - {voice.description}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <div className="card-actions justify-center">
          <button 
            className="btn btn-primary btn-lg"
            onClick={handleGenerateAudiobook}
            disabled={isGeneratingLocal}
          >
            {isGeneratingLocal ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                {tAudiobookGenerationTrigger('generating')}
              </>
            ) : (
              <>
                <span className="text-xl mr-2">🎵</span>
                {tAudiobookGenerationTrigger('createAudiobook')}
              </>
            )}
          </button>
        </div>

        <div className="text-sm text-gray-500 mt-4 space-y-1">
          <p>{tAudiobookGenerationTrigger('estimatedTime')}: {tAudiobookGenerationTrigger('aboutEightMinutes')}</p>
          <p>{tAudiobookGenerationTrigger('creditCost')}: {tAudiobookGenerationTrigger('creditsRequired')}</p>
        </div>
      </div>
    </div>
  );
}
