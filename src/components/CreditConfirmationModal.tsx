'use client';

import { FiCreditCard, FiX, FiZap } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface CreditConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'textEdit' | 'imageEdit';
  requiredCredits: number;
  currentBalance: number;
  editCount: number;
  isFree: boolean;
  isLoading?: boolean;
  // Full story edit specific props
  isFullStory?: boolean;
  chapterCount?: number;
  message?: string;
}

export default function CreditConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  requiredCredits,
  currentBalance,
  editCount,
  isFree,
  isLoading = false,
  isFullStory = false,
  chapterCount,
  message,
}: CreditConfirmationModalProps) {
  const tCommonCreditConfirmation = useTranslations('CreditConfirmation');

  if (!isOpen) return null;

  const actionLabel =
    action === 'textEdit'
      ? tCommonCreditConfirmation('textEdit')
      : tCommonCreditConfirmation('imageEdit');
  const remainingBalance = currentBalance - requiredCredits;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning bg-opacity-20 rounded-lg">
              <FiCreditCard className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isFree
                  ? tCommonCreditConfirmation('freeEditTitle')
                  : tCommonCreditConfirmation('confirmEditTitle')}
              </h2>
              <p className="text-sm text-base-content/70">{actionLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isLoading}
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Full Story Edit Information */}
          {isFullStory && message && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FiZap className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Full Story Edit</span>
              </div>
              <p className="text-sm text-blue-800 mb-2">{message}</p>
              {chapterCount && (
                <p className="text-xs text-blue-600">Editing {chapterCount} chapters</p>
              )}
            </div>
          )}

          {/* Edit Count and Progress - Only show for single chapter edits */}
          {!isFullStory && (
            <div className="bg-base-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {tCommonCreditConfirmation('editProgress')}
                </span>
                <span className="text-xs text-base-content/70">
                  {editCount} {tCommonCreditConfirmation('editsCompleted')}
                </span>
              </div>

              {action === 'textEdit' ? (
                <div>
                  <progress
                    className="progress progress-primary w-full"
                    value={editCount % 5}
                    max={5}
                  ></progress>
                  <p className="text-xs text-base-content/60 mt-1">
                    {editCount < 5
                      ? tCommonCreditConfirmation('textEditFreeRemaining', {
                          remaining: 5 - editCount,
                        })
                      : tCommonCreditConfirmation('textEditPaidMode')}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-base-content/60">
                    {editCount === 0
                      ? tCommonCreditConfirmation('imageEditFirstFree')
                      : tCommonCreditConfirmation('imageEditPaidMode')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Credit Information */}
          <div className="bg-base-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">
                {tCommonCreditConfirmation('creditBalance')}
              </span>
              <div className="flex items-center gap-1">
                <FiZap className="w-4 h-4 text-warning" />
                <span className="font-bold">{currentBalance}</span>
              </div>
            </div>

            {!isFree && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">{tCommonCreditConfirmation('thisEditCosts')}</span>
                  <span className="text-sm font-medium text-error">-{requiredCredits}</span>
                </div>
                <div className="border-tCommonCreditConfirmation border-base-300 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {tCommonCreditConfirmation('remainingBalance')}
                    </span>
                    <div className="flex items-center gap-1">
                      <FiZap className="w-4 h-4 text-warning" />
                      <span className="font-bold">{remainingBalance}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {isFree && (
              <div className="text-sm text-success font-medium">
                {tCommonCreditConfirmation('freeEdit')}
              </div>
            )}
          </div>

          {/* Low Credit Warning */}
          {!isFree && remainingBalance < 2 && (
            <div className="alert alert-warning">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <h3 className="font-bold">{tCommonCreditConfirmation('lowCreditsWarning')}</h3>
                <div className="text-xs">{tCommonCreditConfirmation('lowCreditsMessage')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-tCommonCreditConfirmation border-base-300">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost flex-1"
            disabled={isLoading}
          >
            {tCommonCreditConfirmation('cancel')}
          </button>

          {currentBalance >= requiredCredits ? (
            <button
              type="button"
              onClick={onConfirm}
              className={`btn flex-1 ${isFree ? 'btn-success' : 'btn-primary'}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  {tCommonCreditConfirmation('processing')}
                </>
              ) : (
                <>
                  {isFree ? (
                    <>
                      <FiZap className="w-4 h-4" />
                      {tCommonCreditConfirmation('proceedFree')}
                    </>
                  ) : (
                    <>
                      <FiCreditCard className="w-4 h-4" />
                      {tCommonCreditConfirmation('proceedWithCredits', {
                        credits: requiredCredits,
                      })}
                    </>
                  )}
                </>
              )}
            </button>
          ) : (
            <Link href="/buy-credits" className="btn btn-warning flex-1">
              <FiCreditCard className="w-4 h-4" />
              {tCommonCreditConfirmation('buyCredits')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
