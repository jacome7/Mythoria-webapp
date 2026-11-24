'use client';

import { useTranslations } from 'next-intl';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  showStepsOnMobile?: boolean;
}

export default function ProgressIndicator({
  currentStep,
  totalSteps,
  showStepsOnMobile = false,
}: ProgressIndicatorProps) {
  const t = useTranslations('StorySteps.common');
  const progressLabel = t.rich('stepProgress', {
    currentStep,
    totalSteps,
    current: (chunks) => <strong>{chunks}</strong>,
  });

  return (
    <>
      {!showStepsOnMobile && (
        <div className="block min-[769px]:hidden mb-8">
          <div className="text-center text-sm text-gray-600 mb-2">{progressLabel}</div>
          <progress
            className="progress progress-primary w-full"
            value={currentStep}
            max={totalSteps}
          />
        </div>
      )}

      <div className={showStepsOnMobile ? undefined : 'hidden min-[769px]:block mb-8'}>
        {showStepsOnMobile && <span className="sr-only">{progressLabel}</span>}
        <ul className="steps steps-horizontal w-full" aria-hidden={showStepsOnMobile || undefined}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <li
              key={index}
              className={`step${index < currentStep ? ' step-primary' : ''}`}
              data-content={index + 1}
            ></li>
          ))}
        </ul>
      </div>
    </>
  );
}
