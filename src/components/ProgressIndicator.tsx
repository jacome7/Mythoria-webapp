'use client';

import { useTranslations } from 'next-intl';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  const t = useTranslations('StorySteps.common');

  return (
    <>
      <div className="block md:hidden mb-8">
        <div className="text-center text-sm text-gray-600 mb-2">
          {t('stepProgress', { currentStep, totalSteps })}
        </div>
        <progress
          className="progress progress-primary w-full"
          value={currentStep}
          max={totalSteps}
        />
      </div>

      <div className="hidden md:block mb-8">
        <ul className="steps steps-horizontal w-full">
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
