import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Metadata } from 'next';
import type { ReactNode } from 'react';

type UnsubscribeStatus = 'success' | 'already-unsubscribed' | 'not-found' | 'invalid' | 'error';
type UnsubscribeType = 'lead' | 'user';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: UnsubscribeStatus; email?: string; type?: UnsubscribeType }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Unsubscribe' });

  return {
    title: `${t('success.title')} - Mythoria`,
    description: t.markup('success.message', {
      email: '',
      strong: (chunks) => chunks,
    }),
    robots: 'noindex,nofollow',
  };
}

export default async function UnsubscribePage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { status = 'success', email = '', type = 'lead' } = await searchParams;

  setRequestLocale(locale);

  const t = await getTranslations('Unsubscribe');

  const isUser = type === 'user';

  // Determine which content to show based on status and type
  let title: string;
  let message: ReactNode;
  let isSuccess: boolean;
  let showFarewell = false;

  switch (status) {
    case 'invalid':
      title = t('invalidRequest.title');
      message = t('invalidRequest.message');
      isSuccess = false;
      break;
    case 'not-found':
      title = t('notFound.title');
      message = t('notFound.message');
      isSuccess = false;
      break;
    case 'already-unsubscribed':
      if (isUser) {
        title = t('user.alreadyEssential.title');
        message = t.rich('user.alreadyEssential.message', {
          email,
          strong: (chunks) => <strong>{chunks}</strong>,
        });
      } else {
        title = t('alreadyUnsubscribed.title');
        message = t.rich('alreadyUnsubscribed.message', {
          email,
          strong: (chunks) => <strong>{chunks}</strong>,
        });
      }
      isSuccess = true;
      break;
    case 'error':
      title = t('error.title');
      message = t('error.message');
      isSuccess = false;
      break;
    case 'success':
    default:
      if (isUser) {
        title = t('user.success.title');
        message = t.rich('user.success.message', {
          email,
          strong: (chunks) => <strong>{chunks}</strong>,
        });
        showFarewell = true;
      } else {
        title = t('success.title');
        message = t.rich('success.message', {
          email,
          strong: (chunks) => <strong>{chunks}</strong>,
        });
        showFarewell = true;
      }
      isSuccess = true;
      break;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Status Icon */}
        <div className="flex justify-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center ${
              isSuccess ? 'bg-success' : 'bg-error'
            }`}
          >
            <span className="text-4xl text-white font-bold">{isSuccess ? '✓' : '!'}</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-base-content">{title}</h1>

        {/* Message */}
        <div className="text-base-content/70 text-lg">{message}</div>

        {/* Farewell message for successful unsubscribe */}
        {showFarewell && !isUser && (
          <p className="text-base-content/60 italic text-sm mt-4">{t('success.farewell')}</p>
        )}

        {/* User-specific: hint about profile preferences */}
        {isUser && isSuccess && (
          <p className="text-base-content/60 italic text-sm mt-4">{t('user.profileHint')}</p>
        )}

        {/* Call to Action */}
        <div className="mt-8 flex flex-col gap-3 items-center">
          <Link href={`/${locale}`} className="btn btn-primary btn-lg">
            {t('returnHome')}
          </Link>
          {isUser && isSuccess && (
            <Link href={`/${locale}/profile`} className="btn btn-outline btn-sm">
              {t('user.goToProfile')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
