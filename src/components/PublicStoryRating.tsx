'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { FiStar } from 'react-icons/fi';

interface PublicStoryRatingProps {
  storyId: string;
  onRatingSubmitted?: (rating: number) => void;
}

interface UserRating {
  ratingId: string;
  rating: string;
  feedback: string | null;
  createdAt: string;
}

interface RatingData {
  totalRatings: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  userRating: UserRating | null;
}

export default function PublicStoryRating({ storyId, onRatingSubmitted }: PublicStoryRatingProps) {
  const t = useTranslations('common.storyRating');
  const [userRating, setUserRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [includeNameInFeedback, setIncludeNameInFeedback] = useState<boolean>(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [ratingData, setRatingData] = useState<RatingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch rating data on component mount
  useEffect(() => {
    const fetchRatingData = async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}/ratings`);
        if (response.ok) {
          const data = await response.json();
          setRatingData(data);
          if (data.userRating) {
            setUserRating(parseInt(data.userRating.rating));
            setFeedback(data.userRating.feedback || '');
          }
        }
      } catch (error) {
        console.error('Error fetching rating data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRatingData();
  }, [storyId]);
  const handleStarClick = (starRating: number) => {
    setUserRating(starRating);
    setError(null);
    setHoveredRating(0); // Reset hover state after click
    
    // Show feedback form for ratings 1-3
    if (starRating <= 3) {
      setShowFeedbackForm(true);
    } else {
      // For ratings 4-5, submit immediately
      handleSubmitRating(starRating);
    }
  };

  const handleSubmitRating = async (finalRating: number = userRating, finalFeedback: string = feedback) => {
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
          throw new Error(t('errors.serviceUnavailable'));
        }
        
        throw new Error(errorData.error || t('errors.submitFailed'));
      }

      const result = await response.json();
      
      // Update rating data with new user rating
      if (ratingData) {
        setRatingData({
          ...ratingData,
          userRating: {
            ratingId: result.rating.ratingId,
            rating: result.rating.rating,
            feedback: result.rating.feedback,
            createdAt: result.rating.createdAt,
          }
        });
      }
      
      setSubmitted(true);
      onRatingSubmitted?.(finalRating);
      
      // Reset form state after successful submission
      setShowFeedbackForm(false);
      
      // Refresh rating data to get updated average
      setTimeout(async () => {
        try {
          const refreshResponse = await fetch(`/api/stories/${storyId}/ratings`);
          if (refreshResponse.ok) {
            const refreshedData = await refreshResponse.json();
            setRatingData(refreshedData);
          }
        } catch (error) {
          console.error('Error refreshing rating data:', error);
        }
      }, 500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitRating(userRating, feedback);
  };
  const renderUnifiedStars = () => {
    return [1, 2, 3, 4, 5].map((star) => {
      // Determine what rating to show:
      // 1. If hovering, show hovered rating
      // 2. Otherwise show average rating
      const displayRating = hoveredRating || (ratingData?.averageRating || 0);
      const isFilled = star <= displayRating;
      const isHalfFilled = !isFilled && star - 0.5 <= displayRating;
      
      // Determine colors based on state
      let colorClass = 'text-base-300'; // default empty
      if (hoveredRating && star <= hoveredRating) {
        colorClass = 'text-warning brightness-110'; // brighter when hovering
      } else if (isFilled || isHalfFilled) {
        colorClass = 'text-warning'; // normal filled
      }
      
      return (
        <button
          key={star}
          type="button"
          className={`btn btn-ghost p-1 text-3xl transition-all duration-200 hover:scale-110 ${colorClass} cursor-pointer`}
          onClick={() => handleStarClick(star)}
          onMouseEnter={() => setHoveredRating(star)}
          onMouseLeave={() => setHoveredRating(0)}
          disabled={isSubmitting}
          title={t('starTooltip', {
            count: star,
            plural: star !== 1 ? 's' : '',
          })}
        >
          <FiStar 
            className={
              (hoveredRating && star <= hoveredRating) || isFilled || isHalfFilled
                ? 'fill-current'
                : ''
            } 
          />
        </button>
      );
    });
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
    // After submission, reset the submitted state and show the normal rating interface
    setTimeout(() => {
      setSubmitted(false);
    }, 100);
  }
  return (
    <div className="card bg-base-100 shadow-xl border-2 border-base-300">
      <div className="card-body py-2">
        <div className="text-center">
          <h3 className="card-title justify-center mb-2">
            {t('title') || 'Rate this Story'}
          </h3>

          {/* Unified Star Rating Display */}
          <div className="mb-4">
            {/* Stars with average rating display and interaction */}
            <div className="flex justify-center items-center gap-1 mb-1">
              {renderUnifiedStars()}
            </div>
            
            {/* Rating Information */}
            {ratingData && ratingData.totalRatings > 0 ? (
              <div className="text-center">
                <p className="text-lg font-semibold mb-1">
                  {ratingData.averageRating.toFixed(1)}/5
                </p>
                <p className="text-sm text-base-content/70">
                  {t('basedOnRatings', {
                    count: ratingData.totalRatings,
                    plural: ratingData.totalRatings !== 1 ? 's' : '',
                  })}
                </p>
                {hoveredRating > 0 && (
                  <p className="text-sm text-info mt-2">
                    {t('clickToRate', {
                      count: hoveredRating,
                      plural: hoveredRating !== 1 ? 's' : '',
                    })}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-base-content/70 mb-2">{t('noRatingsYet')}</p>
                {hoveredRating > 0 && (
                  <p className="text-sm text-info">
                    {t('clickToRate', {
                      count: hoveredRating,
                      plural: hoveredRating !== 1 ? 's' : '',
                    })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Show existing user rating info if exists */}
          {ratingData?.userRating && !submitted && (
            <div className="mb-3 p-2 bg-info/10 rounded-lg border border-info/20">
              <p className="text-sm text-info">
                {t('yourCurrentRating')}: {ratingData.userRating.rating} ⭐
                {ratingData.userRating.createdAt && (
                  <span className="ml-2 text-xs">
                    ({new Date(ratingData.userRating.createdAt).toLocaleDateString()})
                  </span>
                )}
              </p>
              {ratingData.userRating.feedback && (
                <p className="text-xs text-base-content/70 mt-1">
                  &ldquo;{ratingData.userRating.feedback}&rdquo;
                </p>
              )}
            </div>
          )}
          
          {/* Feedback Form for low ratings */}
          {showFeedbackForm && (
            <form onSubmit={handleFeedbackSubmit} className="mt-4 space-y-3 border-t pt-3">
              <div className="text-center mb-3">
                <p className="text-sm text-base-content/70">
                  {t('youSelected')} <span className="font-semibold">{userRating} star{userRating !== 1 ? 's' : ''}</span>
                </p>
              </div>
              
              <div className="text-left">
                <label htmlFor="feedback" className="label">
                  <span className="label-text">
                    {t('feedback.title')}
                  </span>
                </label>
                <textarea
                  id="feedback"
                  className="textarea textarea-bordered w-full h-20 resize-none"
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
                  />
                  <span className="label-text">
                    {t('feedback.includeNameLabel')}
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
                    ratingData?.userRating ? t('buttons.updateRating') : t('buttons.submitRating')
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
              <span>{t('submittingMessage')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
