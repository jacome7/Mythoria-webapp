'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { FiStar } from 'react-icons/fi';
import { getAnonymousRating, setAnonymousRating, areCookiesSupported } from '@/utils/cookieUtils';
import { formatDate } from '@/utils/date';

interface StoryRatingProps {
  storyId: string;
  onRatingSubmitted?: (rating: number) => void;
}

interface UserRating {
  ratingId: string;
  rating: string;
  feedback: string | null;
  createdAt: string;
}

interface AnonymousRating {
  rating: string;
  feedback?: string;
  createdAt: string;
}

export default function StoryRating({ storyId, onRatingSubmitted }: StoryRatingProps) {
  const tCommonStoryRating = useTranslations('StoryRating');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [includeNameInFeedback, setIncludeNameInFeedback] = useState<boolean>(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [existingRating, setExistingRating] = useState<UserRating | null>(null);
  const [anonymousRating, setAnonymousRatingState] = useState<AnonymousRating | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cookiesSupported, setCookiesSupported] = useState<boolean>(true);

  // Fetch existing rating on component mount
  useEffect(() => {
    const fetchExistingRating = async () => {
      try {
        // Check cookie support
        const cookieSupport = areCookiesSupported();
        setCookiesSupported(cookieSupport);

        // Check for anonymous rating in cookies first
        if (cookieSupport) {
          const anonymousRatingData = getAnonymousRating(storyId);
          if (anonymousRatingData) {
            setAnonymousRatingState(anonymousRatingData);
            setRating(parseInt(anonymousRatingData.rating));
            setFeedback(anonymousRatingData.feedback || '');
            setLoading(false);
            return;
          }
        }

        // Try to fetch authenticated user rating
        const response = await fetch(`/api/stories/${storyId}/ratings`);
        if (response.ok) {
          const data = await response.json();
          if (data.userRating) {
            setExistingRating(data.userRating);
            setRating(parseInt(data.userRating.rating));
            setFeedback(data.userRating.feedback || '');
          }
        }
      } catch (error) {
        console.error('Error fetching existing rating:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExistingRating();
  }, [storyId]);

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

  const handleSubmitRating = async (
    finalRating: number = rating,
    finalFeedback: string = feedback,
  ) => {
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
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 503) {
          throw new Error(tCommonStoryRating('errors.serviceUnavailable'));
        }

        // Check if this is an anonymous user (no authentication)
        if (response.status === 401 && cookiesSupported) {
          // Store rating in cookie for anonymous users
          setAnonymousRating(storyId, finalRating.toString(), finalFeedback || undefined);
          setAnonymousRatingState({
            rating: finalRating.toString(),
            feedback: finalFeedback || undefined,
            createdAt: new Date().toISOString(),
          });
          setSubmitted(true);
          onRatingSubmitted?.(finalRating);
          setShowFeedbackForm(false);
          return;
        }

        throw new Error(errorData.error || tCommonStoryRating('errors.submitFailed'));
      }

      const result = await response.json();
      setExistingRating({
        ratingId: result.rating.ratingId,
        rating: result.rating.rating,
        feedback: result.rating.feedback,
        createdAt: result.rating.createdAt,
      });
      setSubmitted(true);
      onRatingSubmitted?.(finalRating);

      // Reset form state after successful submission
      setShowFeedbackForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommonStoryRating('errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitRating(rating, feedback);
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl border-2 border-base-300">
        <div className="card-body text-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="card bg-success/10 border border-success/20 shadow-lg">
        <div className="card-body text-center">
          <div className="text-success text-4xl mb-2">✓</div>
          <h3 className="card-title text-success justify-center">
            {existingRating || anonymousRating
              ? tCommonStoryRating('success.titleUpdated') || 'Rating Updated!'
              : tCommonStoryRating('success.title')}
          </h3>
          <p className="text-success/80">
            {existingRating || anonymousRating
              ? tCommonStoryRating('success.messageUpdated') ||
                'Your rating has been updated successfully!'
              : tCommonStoryRating('success.message')}
          </p>

          {/* Allow user to submit another rating only for authenticated users */}
          {existingRating && (
            <button
              onClick={() => {
                setSubmitted(false);
                setShowFeedbackForm(false);
                setError(null);
              }}
              className="btn btn-outline btn-success mt-4"
            >
              Update Rating
            </button>
          )}

          {/* Show message for anonymous users */}
          {anonymousRating && !existingRating && (
            <p className="text-sm text-base-content/60 mt-4">
              {tCommonStoryRating('anonymous.thankYou') || 'Thank you for your feedback!'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl border-2 border-base-300">
      <div className="card-body">
        <div className="text-center">
          <h3 className="card-title justify-center mb-4">
            {existingRating || anonymousRating
              ? tCommonStoryRating('titleUpdate') || 'Update Your Rating'
              : tCommonStoryRating('title')}
          </h3>

          {/* Show existing rating info for authenticated users */}
          {existingRating && !submitted && (
            <div className="mb-4 p-3 bg-info/10 rounded-lg border border-info/20">
              <p className="text-sm text-info">
                {tCommonStoryRating('currentRating') || 'Current Rating'}: {existingRating.rating}{' '}
                ⭐
                {existingRating.createdAt && (
                  <span className="ml-2 text-xs">({formatDate(existingRating.createdAt)})</span>
                )}
              </p>
              {existingRating.feedback && (
                <p className="text-xs text-base-content/70 mt-1">
                  &ldquo;{existingRating.feedback}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Show anonymous rating info */}
          {anonymousRating && !existingRating && !submitted && (
            <div className="mb-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-sm text-warning">
                {tCommonStoryRating('anonymous.alreadyRated') ||
                  'You have already rated this story'}
                : {anonymousRating.rating} ⭐
                {anonymousRating.createdAt && (
                  <span className="ml-2 text-xs">({formatDate(anonymousRating.createdAt)})</span>
                )}
              </p>
              {anonymousRating.feedback && (
                <p className="text-xs text-base-content/70 mt-1">
                  &ldquo;{anonymousRating.feedback}&rdquo;
                </p>
              )}
              <p className="text-xs text-warning/80 mt-2">
                {tCommonStoryRating('anonymous.cannotChange') ||
                  'Anonymous ratings cannot be changed. Please sign in to update your rating.'}
              </p>
            </div>
          )}

          {/* Show cookies disabled warning */}
          {!cookiesSupported && !existingRating && (
            <div className="mb-4 p-3 bg-error/10 rounded-lg border border-error/20">
              <p className="text-sm text-error">
                {tCommonStoryRating('cookies.disabled') ||
                  'Cookies are disabled. Multiple ratings may be allowed.'}
              </p>
            </div>
          )}

          {/* Star Rating */}
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`btn btn-ghost p-2 text-3xl transition-colors ${
                  star <= (hoveredRating || rating) ? 'text-warning' : 'text-base-300'
                }`}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                disabled={isSubmitting || (!!anonymousRating && !existingRating)}
              >
                <FiStar className={star <= (hoveredRating || rating) ? 'fill-current' : ''} />
              </button>
            ))}
          </div>

          {/* Feedback Form for low ratings */}
          {showFeedbackForm && (
            <form onSubmit={handleFeedbackSubmit} className="mt-6 space-y-4">
              <div className="text-left">
                <label htmlFor="feedback" className="label">
                  <span className="label-text">{tCommonStoryRating('feedback.title')}</span>
                </label>
                <textarea
                  id="feedback"
                  className="textarea textarea-bordered w-full h-24 resize-none"
                  placeholder={tCommonStoryRating('feedback.placeholder')}
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
                  />
                  <span className="label-text">
                    {tCommonStoryRating('feedback.includeNameLabel')}
                  </span>
                </label>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowFeedbackForm(false)}
                  disabled={isSubmitting}
                >
                  {tCommonStoryRating('buttons.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      {tCommonStoryRating('buttons.submitting')}
                    </>
                  ) : existingRating || anonymousRating ? (
                    tCommonStoryRating('buttons.updateRating') || 'Update Rating'
                  ) : (
                    tCommonStoryRating('buttons.submitRating')
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
          {isSubmitting && !showFeedbackForm && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="loading loading-spinner loading-sm"></span>
              <span>{tCommonStoryRating('submittingMessage')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
