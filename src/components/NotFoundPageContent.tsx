'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { PapercutCard, PapercutEmptyState, PapercutPage } from '@/components/papercut';

export default function NotFoundPageContent() {
  const t = useTranslations('NotFound');

  return (
    <PapercutPage variant="standard">
      <PapercutEmptyState title={t('mainHeading')} description={t('description')} icon="404">
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/" className="btn btn-primary btn-lg">
            {t('actions.goHome')}
          </Link>
          <Link href="/tell-your-story" className="btn btn-secondary btn-lg">
            {t('actions.createStory')}
          </Link>
        </div>
      </PapercutEmptyState>

      <PapercutCard className="mx-auto mt-8 max-w-3xl p-8 text-center" tone="blue">
        <blockquote>
          <p className="text-lg italic leading-relaxed">{t('quote')}</p>
        </blockquote>
      </PapercutCard>
    </PapercutPage>
  );
}
