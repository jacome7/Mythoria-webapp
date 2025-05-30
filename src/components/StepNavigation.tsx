'use client';

import Link from 'next/link';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  nextHref: string | null;
  prevHref: string | null;
  onNext?: () => void;
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
  nextLabel = 'Next Chapter',
  prevLabel = 'Previous Chapter'
}: StepNavigationProps) => {
  const handleNext = () => {
    if (onNext) {
      onNext();
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
            className="btn btn-outline btn-lg"
            onClick={handlePrev}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {prevLabel}
          </Link>
        ) : (
          <div></div> // Empty div to maintain flex layout
        )}
      </div>

      <div className="text-sm text-gray-500">
        Step {currentStep} of {totalSteps}
      </div>

      <div>
        {nextHref ? (
          <Link 
            href={nextHref} 
            className={`btn btn-primary btn-lg ${nextDisabled ? 'btn-disabled' : ''}`}
            onClick={handleNext}
          >
            {currentStep === totalSteps - 1 ? 'Finish Story' : nextLabel}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <div></div> // Empty div to maintain flex layout
        )}
      </div>
    </div>
  );
};

export default StepNavigation;
