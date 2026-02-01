'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  FiX,
  FiDownload,
  FiMail,
  FiInfo,
  FiAlertTriangle,
  FiCheckCircle,
  FiShield,
} from 'react-icons/fi';
import { fetchSelfPrintPricing } from '@/lib/pricing/fetch-self-print-pricing';
import { trackPaidAction } from '@/lib/analytics';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseEmails = (value: string): string[] =>
  value
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter(Boolean);

const dedupeEmails = (emails: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const email of emails) {
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(email);
  }
  return result;
};

interface SelfPrintModalProps {
  isOpen: boolean;
  storyId?: string;
  storyTitle?: string;
  onClose: () => void;
  onSuccess?: (payload: SelfPrintSuccessPayload) => void;
}

interface SelfPrintSuccessPayload {
  storyId: string;
  workflowId: string;
  executionId: string;
  creditsDeducted: number;
  balance: {
    previous: number;
    current: number;
  };
  recipients: string[];
  message?: string;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

interface SelfPrintErrorResponse {
  success: false;
  error: string;
  shortfall?: number;
  required?: number;
  available?: number;
}

interface SelfPrintSuccessResponse extends SelfPrintSuccessPayload {
  success: true;
}

type SelfPrintResponse = SelfPrintSuccessResponse | SelfPrintErrorResponse;

export function SelfPrintModal({
  isOpen,
  storyId,
  storyTitle,
  onClose,
  onSuccess,
}: SelfPrintModalProps) {
  const t = useTranslations('SelfPrintModal');
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pricingCredits, setPricingCredits] = useState<number | null>(null);
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [additionalEmailsInput, setAdditionalEmailsInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SelfPrintSuccessPayload | null>(null);

  const resetState = useCallback(() => {
    setLoadState('idle');
    setLoadError(null);
    setPricingCredits(null);
    setCurrentCredits(null);
    setAccountEmail('');
    setAdditionalEmailsInput('');
    setSubmitError(null);
    setIsSubmitting(false);
    setResult(null);
  }, []);

  useEffect(() => {
    if (isOpen && storyId) {
      setLoadState('loading');
      setLoadError(null);
      const load = async () => {
        try {
          const [pricing, creditsResp, authorResp] = await Promise.all([
            fetchSelfPrintPricing(),
            fetch('/api/my-credits'),
            fetch('/api/auth/me'),
          ]);

          setPricingCredits(pricing.credits);

          if (!creditsResp.ok) {
            throw new Error('credits_request_failed');
          }
          const creditsData = (await creditsResp.json()) as { currentBalance?: number };
          setCurrentCredits(creditsData.currentBalance ?? 0);

          if (authorResp.ok) {
            const authorData = (await authorResp.json()) as { email?: string };
            setAccountEmail(authorData.email || '');
          } else if (authorResp.status === 401) {
            setAccountEmail('');
          } else {
            throw new Error('author_request_failed');
          }

          setLoadState('ready');
        } catch (error) {
          console.error('Failed to load self-print prerequisites', error);
          setLoadState('error');
          setLoadError(t('errors.loadFailed'));
        }
      };
      load();
    } else if (!isOpen) {
      resetState();
    }
  }, [isOpen, storyId, resetState, t]);

  const creditShortfall = useMemo(() => {
    if (pricingCredits == null || currentCredits == null) return 0;
    return Math.max(0, pricingCredits - currentCredits);
  }, [pricingCredits, currentCredits]);

  const hasAuthorEmail = Boolean(accountEmail?.trim());

  const canSubmit =
    Boolean(storyId) &&
    loadState === 'ready' &&
    !isSubmitting &&
    pricingCredits != null &&
    currentCredits != null &&
    hasAuthorEmail &&
    creditShortfall === 0;

  const showModal = isOpen && storyId;
  if (!showModal) {
    return null;
  }

  const handleSubmit = async () => {
    if (!storyId || !canSubmit) {
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const parsedEmails = dedupeEmails(parseEmails(additionalEmailsInput));
      const invalidEmails = parsedEmails.filter((email) => !EMAIL_REGEX.test(email));
      if (invalidEmails.length) {
        setSubmitError(
          t('errors.invalidEmails', {
            emails: invalidEmails.join(', '),
          }),
        );
        return;
      }

      const response = await fetch(`/api/stories/${storyId}/self-print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails: parsedEmails,
        }),
      });

      const data = (await response.json()) as SelfPrintResponse;

      if (!response.ok || !('success' in data && data.success)) {
        if (response.status === 402 && 'shortfall' in data) {
          setSubmitError(
            t('errors.insufficientCredits', {
              shortfall: data.shortfall ?? 0,
            }),
          );
          setCurrentCredits(data.available ?? currentCredits ?? 0);
        } else if (response.status === 401) {
          setSubmitError(t('errors.authRequired'));
        } else {
          setSubmitError(('error' in data && data.error) || t('errors.generic'));
        }
        return;
      }

      setResult(data);
      setCurrentCredits(data.balance.current);
      onSuccess?.(data);
      trackPaidAction({
        action_type: 'self_print',
        story_id: data.storyId,
        credits_spent: data.creditsDeducted,
      });
    } catch (error) {
      console.error('Failed to queue self-print workflow', error);
      setSubmitError(t('errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      <p className="font-medium">{t('loading.title')}</p>
      <p className="text-sm text-base-content/70">{t('loading.subtitle')}</p>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
      <FiAlertTriangle className="w-10 h-10 text-error" />
      <p className="font-medium">{loadError || t('errors.loadFailed')}</p>
      <button className="btn btn-primary btn-sm" onClick={handleClose}>
        {t('actions.close')}
      </button>
    </div>
  );

  const renderForm = () => (
    <div className="space-y-6">
      <div className="bg-base-200 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium">{t('costSection.required')}</span>
          <span className="text-lg font-semibold">
            {pricingCredits ?? '—'} {t('costSection.credits')}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>{t('costSection.youHave')}</span>
          <span className="font-semibold">
            {currentCredits ?? '—'} {t('costSection.credits')}
          </span>
        </div>
        {creditShortfall > 0 && (
          <div className="mt-3 alert alert-warning">
            <div>
              <FiAlertTriangle className="w-5 h-5" />
              <div>
                <h4 className="font-semibold">{t('costSection.needMore')}</h4>
                <p className="text-sm">
                  {t('costSection.needMoreDescription', { shortfall: creditShortfall })}
                </p>
              </div>
            </div>
            <div>
              <Link href="/pricing#buy-credits" className="btn btn-sm btn-primary">
                {t('actions.buyCredits')}
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <label className="form-control w-full">
          <div className="label justify-between">
            <span className="label-text font-medium">{t('emailSection.label')}</span>
            <span className="label-text-alt">{t('emailSection.optional')}</span>
          </div>
          <textarea
            rows={4}
            value={additionalEmailsInput}
            onChange={(event) => setAdditionalEmailsInput(event.target.value)}
            className="textarea textarea-bordered w-full"
            placeholder={t('emailSection.placeholder')}
          />
          <div className="mt-2 px-1 space-y-1">
            <p className="text-xs text-base-content/70 break-words">
              {t('emailSection.helper', { email: accountEmail || t('emailSection.yourAccount') })}
            </p>
            <p className="text-xs text-base-content/60 break-words">
              {t('emailSection.multiHelper')}
            </p>
          </div>
        </label>
        {!hasAuthorEmail && (
          <p className="text-xs text-error">{t('emailSection.accountMissing')}</p>
        )}
      </div>

      <div className="bg-base-200 rounded-lg p-4 space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <FiInfo className="w-5 h-5 text-primary mt-1 shrink-0" />
          <p className="break-words">{t('finePrint.deduction')}</p>
        </div>
        <div className="flex items-start gap-3">
          <FiShield className="w-5 h-5 text-primary mt-1 shrink-0" />
          <p className="break-words">
            {t.rich('finePrint.support', {
              email: (chunks) => (
                <a href="mailto:support@mythoria.pt" className="link link-primary">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </div>

      {submitError && (
        <div className="alert alert-error">
          <FiAlertTriangle className="w-5 h-5" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button className="btn btn-ghost flex-1" onClick={handleClose}>
          {t('actions.cancel')}
        </button>
        <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={!canSubmit}>
          {isSubmitting ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <>
              <FiMail className="w-4 h-4" />
              <span>{t('actions.confirm')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderSuccess = () => {
    if (!result) return null;

    return (
      <div className="space-y-6">
        <div className="alert alert-success">
          <FiCheckCircle className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">{t('success.title')}</h3>
            <p className="text-sm text-base-content/70">{t('success.description')}</p>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiMail className="w-5 h-5 text-primary mt-1" />
            <div className="space-y-2 w-full">
              <div>
                <p className="font-medium">{t('success.recipientsHeading')}</p>
              </div>
              {result.recipients.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {result.recipients.map((email) => (
                      <span key={email} className="badge badge-outline">
                        {email}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-base-content/70">
                    {t('success.spamNotice')}{' '}
                    <Link href="/contactUs" className="link link-primary">
                      {t('success.contactUs')}
                    </Link>
                  </p>
                </>
              ) : (
                <p className="text-sm text-base-content/70">{t('success.noRecipients')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/pricing#buy-credits" className="btn btn-outline flex-1">
            {t('actions.buyMoreCredits')}
          </Link>
          <button className="btn btn-primary flex-1" onClick={handleClose}>
            {t('actions.close')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-base-100 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-base-200 p-5">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2">
              <FiDownload className="text-primary shrink-0" />
              <h2 className="text-lg font-semibold">{t('title')}</h2>
            </div>
            {storyTitle && (
              <p className="text-sm text-base-content/70 mt-1 break-words">
                {t('subtitle', { title: storyTitle })}
              </p>
            )}
          </div>
          <button className="btn btn-ghost btn-sm shrink-0" onClick={handleClose}>
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {loadState === 'loading' && renderLoading()}
          {loadState === 'error' && renderError()}
          {loadState === 'ready' && !result && renderForm()}
          {result && renderSuccess()}
        </div>
      </div>
    </div>
  );
}

export type { SelfPrintSuccessPayload };
