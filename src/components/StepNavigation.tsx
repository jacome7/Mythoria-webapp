'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  nextHref: string | null;
  prevHref: string | null;
  onNext?: () => void | Promise<void> | Promise<boolean>;
  onPrev?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  prevLabel?: string;
}

const StepNavigation = ({
  currentStep,
  totalSteps,
  nextHref,
  prevHref,
  onNext,
  onPrev,
  nextDisabled = false,
  nextLabel,
  prevLabel
}: StepNavigationProps) => {
  const router = useRouter();
  const t = useTranslations('common.StepNavigation');

  const resolvedNextLabel = nextLabel ?? t('next');
  const resolvedPrevLabel = prevLabel ?? t('prev');
  const handleNext = async () => {
    if (onNext) {
      const result = await onNext();
      // If onNext returns a boolean and it's false, don't navigate
      // If onNext returns void or true, and nextHref exists, navigate
      // If no nextHref, the onNext function should handle navigation itself
      if (result !== false && nextHref) {
        router.push(nextHref);
      }
    } else if (nextHref) {
      router.push(nextHref);
    }
  };

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
    }
  };

  return (
    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
      <div>
        {prevHref ? (
          <Link 
            href={prevHref} 
            className="btn btn-outline btn-md md:btn-lg" // Responsive button size
            onClick={handlePrev}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 md:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"> {/* Responsive icon margin */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {resolvedPrevLabel}
          </Link>
        ) : (
          <div></div> // Empty div to maintain flex layout
        )}
      </div>
      <div></div>
      <div>
        {nextHref && onNext ? (
          <button 
            onClick={handleNext}
            disabled={nextDisabled}
            className={`btn btn-primary btn-md md:btn-lg ${nextDisabled ? 'btn-disabled' : ''}`} // Responsive button size
          >
            {currentStep === totalSteps - 1 ? t('finish') : resolvedNextLabel} {/* Shortened "Finish Story" */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 md:ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"> {/* Responsive icon margin */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : nextHref ? (
          <Link 
            href={nextHref} 
            className={`btn btn-primary btn-md md:btn-lg ${nextDisabled ? 'btn-disabled' : ''}`} // Responsive button size
            onClick={handleNext}
          >
            {currentStep === totalSteps - 1 ? t('finish') : resolvedNextLabel} {/* Shortened "Finish Story" */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 md:ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"> {/* Responsive icon margin */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : onNext ? (
          <button 
            onClick={handleNext}
            disabled={nextDisabled}
            className={`btn btn-primary btn-md md:btn-lg ${nextDisabled ? 'btn-disabled' : ''}`} // Responsive button size
          >
            {currentStep === totalSteps - 1 ? t('finish') : resolvedNextLabel} {/* Shortened "Finish Story" */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 md:ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"> {/* Responsive icon margin */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div></div> // Empty div to maintain flex layout
        )}
      </div>
    </div>
  );
};

export default StepNavigation;
