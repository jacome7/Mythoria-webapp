import type { ReactNode } from 'react';

interface SurveyStatusCardProps {
  title: string;
  body: string;
  homeLabel: string;
  locale: string;
  /** Optional extra block (e.g. a reward reminder with a call to action). */
  children?: ReactNode;
}

/**
 * Friendly end-state for a survey link (invalid, closed, already answered). Deliberately shows no
 * account details: the page is reachable by anyone holding the link.
 */
export default function SurveyStatusCard({
  title,
  body,
  homeLabel,
  locale,
  children,
}: SurveyStatusCardProps) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="rounded-box border border-base-300 bg-base-100 p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-3 text-lg text-base-content/80">{body}</p>
        {children}
        <div className="mt-6">
          <a href={`/${locale}`} className="btn btn-primary">
            {homeLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
