'use client';

import { localize } from '@/lib/surveys/engine';
import type { QuestionOfType } from './types';
import { questionDomIds } from './types';

/** Non-answerable heading + body block. */
export default function StaticContent({
  question,
  locale,
}: {
  question: QuestionOfType<'static_content'>;
  locale: string;
}) {
  const ids = questionDomIds(question.id);
  return (
    <section
      className="rounded-box border border-base-300 bg-base-200/60 p-4"
      data-question-id={question.id}
      aria-labelledby={ids.label}
    >
      <h3 id={ids.label} className="text-lg font-semibold">
        {localize(question.label, locale)}
      </h3>
      {question.body ? (
        <p className="mt-1 whitespace-pre-line text-base text-base-content/80">
          {localize(question.body, locale)}
        </p>
      ) : null}
    </section>
  );
}
