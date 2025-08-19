'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiX, FiGlobe, FiAlertCircle } from 'react-icons/fi';
import Link from 'next/link';
import JobProgressModal from './JobProgressModal';
import { createTranslateJob } from '@/utils/async-job-api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  currentLanguage: string;
  onRedirectToRead: (storyId: string) => void; // invoked after success when user closes success dialog
}

export default function TranslateFullStoryModal({
  isOpen,
  onClose,
  storyId,
  currentLanguage,
  onRedirectToRead,
}: Props) {
  const tModal = useTranslations('TranslateFullStoryModal');
  const tStep4 = useTranslations('StorySteps.step4');
  const [languages, setLanguages] = useState<Array<{ value: string; label: string }>>([]);
  const [targetLocale, setTargetLocale] = useState<string>('');
  const [duplicate, setDuplicate] = useState<boolean>(false);
  const [creditInfo, setCreditInfo] = useState<{
    canEdit: boolean;
    totalCredits: number;
    currentBalance: number;
    freeEdits?: number;
    paidEdits?: number;
    chapterCount?: number;
    message?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);

  // job progress
  const [jobId, setJobId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  // final story id after optional duplication
  const [resultStoryId, setResultStoryId] = useState<string | null>(null);

  // load languages from messages
  useEffect(() => {
    if (!isOpen) return;
    try {
      const opts = tStep4.raw('languageOptions') as Array<{ value: string; label: string }>;
      setLanguages(opts);
      // default selection: first different from current
      const firstAlt = opts.find(o => o.value !== currentLanguage);
      setTargetLocale(firstAlt?.value || '');
  } catch {
      // fallback empty
      setLanguages([]);
    }
  }, [isOpen, tStep4, currentLanguage]);

  // fetch credit info when open
  useEffect(() => {
    const run = async () => {
      if (!isOpen) return;
      setChecking(true);
      setError(null);
      try {
        const resp = await fetch('/api/ai-edit/check-full-story-credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyId }),
        });
        const data = await resp.json();
        if (resp.ok && data?.success) {
          setCreditInfo({
            canEdit: data.canEdit,
            totalCredits: data.totalCredits,
            currentBalance: data.currentBalance,
            freeEdits: data.freeEdits,
            paidEdits: data.paidEdits,
            chapterCount: data.chapterCount,
            message: data.message,
          });
        } else {
          setError(data?.error || tModal('errors.unableToCheckCredits'));
        }
  } catch {
        setError(tModal('errors.unableToCheckCredits'));
      } finally {
        setChecking(false);
      }
    };
    run();
  }, [isOpen, storyId, tModal]);

  const insufficientCredits = useMemo(() => {
    if (!creditInfo) return false;
    return creditInfo.totalCredits > creditInfo.currentBalance;
  }, [creditInfo]);

  const targetEqualsCurrent = Boolean(targetLocale) && targetLocale === currentLanguage;

  const startTranslation = async () => {
    setError(null);
    if (!targetLocale || targetEqualsCurrent) {
      setError(tModal('errors.selectDifferentLanguage'));
      return;
    }
    if (!creditInfo) {
      setError(tModal('errors.unableToCheckCredits'));
      return;
    }
    if (insufficientCredits) {
      // Disable by UI guards anyway
      return;
    }

    setCreating(true);
    try {
      let effectiveStoryId = storyId;
      if (duplicate) {
        const dup = await fetch(`/api/my-stories/${storyId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'duplicate', locale: targetLocale }),
        });
        if (!dup.ok) {
          const err = await dup.json().catch(() => ({}));
          throw new Error(err?.error || 'Duplicate failed');
        }
        const dupData = await dup.json();
        effectiveStoryId = dupData?.story?.storyId || dupData?.storyId || effectiveStoryId;
      }

      // remember which story we are translating to redirect after completion
      setResultStoryId(effectiveStoryId);

      const job = await createTranslateJob({ storyId: effectiveStoryId, targetLocale });
      if (job.success && job.jobId) {
        setJobId(job.jobId);
        setShowProgress(true);
      } else {
        throw new Error('Failed to create translation job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tModal('errors.unableToStart'));
    } finally {
      setCreating(false);
    }
  };

  const handleJobComplete = () => {
    setShowProgress(false);
    setJobId(null);
    // credits are deducted by backend workflow per existing pattern
    onClose();
    // Let parent handle redirect (keeping UI locale)
    onRedirectToRead(resultStoryId || storyId);
    setResultStoryId(null);
  };

  const handleJobError = (msg: string) => {
    setShowProgress(false);
    setJobId(null);
    setError(msg || tModal('errors.failed'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiGlobe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{tModal('title')}</h2>
              <p className="text-sm text-gray-600">{tModal('currentLanguage', { lang: currentLanguage })}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <FiX className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Target language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tModal('targetLanguage')}</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={targetLocale}
              onChange={(e) => setTargetLocale(e.target.value)}
            >
              {languages.map(opt => (
                <option key={opt.value} value={opt.value} disabled={opt.value === currentLanguage}>
                  {opt.label}
                </option>
              ))}
            </select>
            {targetEqualsCurrent && (
              <p className="text-xs text-red-600 mt-1">{tModal('errors.selectDifferentLanguage')}</p>
            )}
          </div>

          {/* Duplicate checkbox */}
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={duplicate} onChange={(e) => setDuplicate(e.target.checked)} />
              {tModal('duplicateLabel')}
            </label>
            <p className="text-xs text-gray-600 whitespace-pre-line">
              {duplicate ? tModal('duplicateOn') : tModal('duplicateOff')}
            </p>
          </div>

          {/* Cost */}
          {creditInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              <div className="font-medium mb-1">{tModal('cost.title')}</div>
              <div className="space-y-1">
                <div>{creditInfo.message}</div>
                {typeof creditInfo.freeEdits === 'number' && creditInfo.freeEdits > 0 && (
                  <div>{tModal('cost.freeEdits', { count: creditInfo.freeEdits })}</div>
                )}
                {typeof creditInfo.paidEdits === 'number' && creditInfo.paidEdits > 0 && (
                  <div>{tModal('cost.paidEdits', { count: creditInfo.paidEdits })}</div>
                )}
                <div>{tModal('cost.balance', { credits: creditInfo.currentBalance })}</div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
              <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:text-gray-900">
            {tModal('cancel')}
          </button>
          {insufficientCredits ? (
            <Link href="/buy-credits" className="px-5 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600">
              {tModal('buyCredits')}
            </Link>
          ) : (
            <button
              onClick={startTranslation}
              disabled={checking || creating || !Boolean(targetLocale) || targetEqualsCurrent}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {creating ? tModal('processing') : tModal('translate')}
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {showProgress && (
        <JobProgressModal
          isOpen={showProgress}
          onClose={() => { setShowProgress(false); setJobId(null); }}
          jobId={jobId}
          jobType="text_edit"
          onComplete={handleJobComplete}
          onError={handleJobError}
        />
      )}
    </div>
  );
}
