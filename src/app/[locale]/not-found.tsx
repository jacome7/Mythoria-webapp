'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { PapercutCard, PapercutEmptyState, PapercutPage } from '@/components/papercut';

export default function NotFound() {
  const tNotFound = useTranslations('NotFound');

  return (
    <PapercutPage variant="standard">
      <PapercutEmptyState
        title={tNotFound('mainHeading')}
        description={tNotFound('description')}
        icon="404"
      >
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/" className="btn btn-primary btn-lg">
            {tNotFound('actions.goHome')}
          </Link>
          <Link href="/tell-your-story" className="btn btn-secondary btn-lg">
            {tNotFound('actions.createStory')}
          </Link>
          <Link href="/my-stories" className="btn btn-outline btn-lg">
            {tNotFound('actions.myStories')}
          </Link>
        </div>
      </PapercutEmptyState>

      <PapercutCard className="my-8 p-8" tone="blue">
        <h2 className="mb-6 text-center text-2xl font-bold">{tNotFound('suggestions.title')}</h2>
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
          {tNotFound.raw('suggestions.items').map((item: string, index: number) => {
            const firstSpace = item.indexOf(' ');
            const text = firstSpace >= 0 ? item.substring(firstSpace + 1) : item;

            return (
              <div key={index} className="rounded-lg border border-base-content/10 bg-white/30 p-4">
                {text}
              </div>
            );
          })}
        </div>
      </PapercutCard>

      <PapercutCard className="mx-auto max-w-3xl p-8 text-center" tone="accent">
        <blockquote>
          <p className="text-lg italic leading-relaxed">{tNotFound('quote')}</p>
        </blockquote>
      </PapercutCard>
    </PapercutPage>
  );
}
