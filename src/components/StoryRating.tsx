'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiStar } from 'react-icons/fi';

interface StoryRatingProps {
  storyId: string;
  onRatingSubmitted?: (rating: number) => void;
}

export default function StoryRating({ storyId, onRatingSubmitted }: StoryRatingProps) {
  const t = useTranslations('common.storyRating');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [includeNameInFeedback, setIncludeNameInFeedback] = useState<boolean>(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
    setError(null);
    
    // Show feedback form for ratings 1-3
    if (starRating <= 3) {
      setShowFeedbackForm(true);
    } else {
      // For ratings 4-5, submit immediately
      handleSubmitRating(starRating);
    }
  };

  const handleSubmitRating = async (finalRating: number = rating, finalFeedback: string = feedback) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: finalRating.toString(),
          feedback: finalFeedback || null,
          includeNameInFeedback,
        }),
      });      if (!response.ok) {
        const errorData = await response.json();
          if (response.status === 503) {
          throw new Error(t('errors.serviceUnavailable'));
        }
        
        throw new Error(errorData.error || t('errors.submitFailed'));
      }

      setSubmitted(true);
      onRatingSubmitted?.(finalRating);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitRating(rating, feedback);
  };

  if (submitted) {
    return (
      <div className="card bg-success/10 border border-success/20 shadow-lg">
        <div className="card-body text-center">
          <div className="text-success text-4xl mb-2">✓</div>          <h3 className="card-title text-success justify-center">{t('success.title')}</h3>
          <p className="text-success/80">{t('success.message')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl border-2 border-base-300">
      <div className="card-body">
        <div className="text-center">
          <h3 className="card-title justify-center mb-4">{t('title')}</h3>
          
          {/* Star Rating */}
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`btn btn-ghost p-2 text-3xl transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'text-warning'
                    : 'text-base-300'
                }`}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                disabled={isSubmitting}
              >
                <FiStar 
                  className={star <= (hoveredRating || rating) ? 'fill-current' : ''} 
                />
              </button>
            ))}
          </div>

          {/* Feedback Form for low ratings */}
          {showFeedbackForm && (
            <form onSubmit={handleFeedbackSubmit} className="mt-6 space-y-4">
              <div className="text-left">                <label htmlFor="feedback" className="label">
                  <span className="label-text">
                    {t('feedback.title')}
                  </span>
                </label>
                <textarea
                  id="feedback"
                  className="textarea textarea-bordered w-full h-24 resize-none"
                  placeholder={t('feedback.placeholder')}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={includeNameInFeedback}
                    onChange={(e) => setIncludeNameInFeedback(e.target.checked)}
                    disabled={isSubmitting}
                  />                  <span className="label-text">
                    {t('feedback.includeNameLabel')}
                  </span>
                </label>
              </div>

              <div className="flex gap-2 justify-end">                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowFeedbackForm(false)}
                  disabled={isSubmitting}
                >
                  {t('buttons.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      {t('buttons.submitting')}
                    </>
                  ) : (
                    t('buttons.submitRating')
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Error Message */}
          {error && (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          )}

          {/* Loading state for high ratings */}
          {isSubmitting && !showFeedbackForm && (            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="loading loading-spinner loading-sm"></span>
              <span>{t('submittingMessage')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
