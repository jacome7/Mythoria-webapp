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
  const t = useTranslations('stories.audioGeneration');
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
        throw new Error(errorData.error || 'Failed to start audiobook generation');
      }

      // The response will be 202 Accepted, and the workflow will process asynchronously
      const result = await response.json();
      console.log('Audiobook generation started:', result);
      
      // The progress component will now start polling for updates
      
    } catch (error) {
      console.error('Error generating audiobook:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate audiobook');
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
    { value: 'alloy', label: 'Alloy', description: 'Neutral, balanced voice' },
    { value: 'echo', label: 'Echo', description: 'Clear, expressive voice' },
    { value: 'fable', label: 'Fable', description: 'Warm, storytelling voice' },
    { value: 'nova', label: 'Nova', description: 'Bright, energetic voice' },
    { value: 'onyx', label: 'Onyx', description: 'Deep, authoritative voice' },
    { value: 'shimmer', label: 'Shimmer', description: 'Gentle, soothing voice' },
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
          {t('generateAudiobook')}
        </h3>
        
        <p className="text-gray-600 mb-6">
          {t('audiobookDescription')}
        </p>

        {/* Voice Selection */}
        <div className="mb-6">
          <label className="label">
            <span className="label-text font-medium">{t('selectVoice')}</span>
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
                {t('generating')}
              </>
            ) : (
              <>
                <span className="text-xl mr-2">🎵</span>
                {t('createAudiobook')}
              </>
            )}
          </button>
        </div>

        <div className="text-sm text-gray-500 mt-4 space-y-1">
          <p>{t('estimatedTime')}: {t('aboutEightMinutes')}</p>
          <p>{t('creditCost')}: {t('creditsRequired')}</p>
        </div>
      </div>
    </div>
  );
}
