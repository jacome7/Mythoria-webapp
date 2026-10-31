'use client';

import { useRef, useState } from 'react';
import WizardActionBar from './WizardActionBar';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';

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
  busy?: boolean;
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
  prevLabel,
  busy = false,
}: StepNavigationProps) => {
  const router = useRouter();
  const pending = useRef(false);
  const [running, setRunning] = useState(false);
  const tCommonStepNavigation = useTranslations('StepNavigation');

  const resolvedNextLabel =
    nextLabel ??
    (currentStep === totalSteps - 1
      ? tCommonStepNavigation('finish')
      : tCommonStepNavigation('next'));
  const resolvedPrevLabel = prevLabel ?? tCommonStepNavigation('prev');
  const handleNext = async () => {
    if (pending.current || nextDisabled || busy) return;
    pending.current = true;
    setRunning(true);
    try {
      const result = onNext ? await onNext() : true;
      if (result !== false && nextHref) router.push(nextHref);
    } finally {
      pending.current = false;
      setRunning(false);
    }
  };

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
    }
  };

  return (
    <WizardActionBar>
      <div>
        {prevHref ? (
          <Link
            aria-disabled={busy || running}
            tabIndex={busy || running ? -1 : undefined}
            href={prevHref}
            className="btn btn-outline btn-md md:btn-lg" // Responsive button size
            onClick={(event) => {
              if (busy || running) event.preventDefault();
              else handlePrev();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1 md:mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {' '}
              {/* Responsive icon margin */}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
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
            disabled={nextDisabled || busy || running}
            className={`btn btn-primary btn-md md:btn-lg ${nextDisabled ? 'btn-disabled' : ''}`} // Responsive button size
          >
            {resolvedNextLabel}{' '}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-1 md:ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {' '}
              {/* Responsive icon margin */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : nextHref ? (
          <Link
            href={nextHref}
            className={`btn btn-primary btn-md md:btn-lg ${nextDisabled ? 'btn-disabled' : ''}`} // Responsive button size
            onClick={(event) => {
              if (nextDisabled || busy || running) event.preventDefault();
            }}
            aria-disabled={nextDisabled || busy || running}
            tabIndex={nextDisabled || busy || running ? -1 : undefined}
          >
            {resolvedNextLabel}{' '}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-1 md:ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {' '}
              {/* Responsive icon margin */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : onNext ? (
          <button
            onClick={handleNext}
            disabled={nextDisabled || busy || running}
            className={`btn btn-primary btn-md md:btn-lg ${nextDisabled ? 'btn-disabled' : ''}`} // Responsive button size
          >
            {resolvedNextLabel}{' '}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-1 md:ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {' '}
              {/* Responsive icon margin */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div></div> // Empty div to maintain flex layout
        )}
      </div>
    </WizardActionBar>
  );
};

export default StepNavigation;
