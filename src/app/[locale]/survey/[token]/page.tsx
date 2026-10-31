import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import SurveyRenderer from '@/components/surveys/SurveyRenderer';
import SurveyStatusCard from '@/components/surveys/SurveyStatusCard';
import { resolveInvitation } from '@/db/services/survey-responses';
import { surveyRespondentLogger } from '@/lib/surveys/respondent-logger';

// Answering needs no login: the signed token identifies the invitation. Never cache or index.
export const dynamic = 'force-dynamic';

interface SurveyPageProps {
  params: Promise<{ locale: string; token: string }>;
}

export async function generateMetadata({ params }: SurveyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Survey' });
  return {
    title: `${t('meta.title')} | Mythoria`,
    description: t('meta.description'),
    robots: { index: false, follow: false, nocache: true },
    // The URL is a bearer credential: never leak it through the Referer header.
    referrer: 'no-referrer',
  };
}

export default async function SurveyPage({ params }: SurveyPageProps) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Survey' });

  let state: Awaited<ReturnType<typeof resolveInvitation>>;
  try {
    state = await resolveInvitation(token);
  } catch (error) {
    // Treat infrastructure failures like an unusable link rather than leaking details.
    surveyRespondentLogger.error('survey_page_resolve_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    state = { state: 'invalid' };
  }

  if (state.state === 'invalid') {
    return (
      <SurveyStatusCard
        locale={locale}
        title={t('status.invalid.title')}
        body={t('status.invalid.body')}
        homeLabel={t('status.backHome')}
      />
    );
  }

  if (state.state === 'closed') {
    return (
      <SurveyStatusCard
        locale={locale}
        title={t('status.closed.title')}
        body={t('status.closed.body')}
        homeLabel={t('status.backHome')}
      />
    );
  }

  if (state.state === 'submitted') {
    return (
      <SurveyStatusCard
        locale={locale}
        title={t('status.submitted.title')}
        body={t('status.submitted.body')}
        homeLabel={t('status.backHome')}
      >
        {state.rewardEntitlementId ? (
          <div className="mt-6 rounded-box border border-primary/40 bg-primary/5 p-4">
            <p className="text-base">{t('status.submittedReward')}</p>
            <a
              href={`/${locale}/survey/reward/${state.rewardEntitlementId}`}
              className="btn btn-primary mt-3"
            >
              {t('completion.rewardCta')}
            </a>
          </div>
        ) : null}
      </SurveyStatusCard>
    );
  }

  return (
    <SurveyRenderer
      token={token}
      definition={state.definition}
      surveyId={state.surveyId}
      version={state.version}
      cohortKey={state.cohortKey}
      initialAnswers={state.draftAnswers}
      initialStatus={state.status}
    />
  );
}
