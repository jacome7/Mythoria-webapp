'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

interface EditCreditInfoProps {
  canEdit: boolean;
  requiredCredits: number;
  currentBalance: number;
  editCount: number;
  message?: string;
  nextThreshold?: number;
  isFree?: boolean;
  action: 'textEdit' | 'imageEdit';
}

export default function EditCreditInfo({
  canEdit,
  currentBalance,
  editCount,
  message,
  nextThreshold,
  isFree,
  action
}: EditCreditInfoProps) {
  const locale = useLocale();
  const tEditCreditInfo = useTranslations('EditCreditInfo');

  if (!message) return null;

  return (
    <div className="mb-4">
      {/* Credit status message */}
      <div className={`text-sm p-3 rounded-lg ${
        !canEdit 
          ? 'bg-red-50 text-red-700 border border-red-200'
          : isFree 
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">{message}</span>
          <span className="text-xs opacity-75">
            {tEditCreditInfo('editLabel', { number: editCount + 1 })}
          </span>
        </div>
        
        {/* Additional info for insufficient credits */}
        {!canEdit && (
          <div className="mt-2 pt-2 border-t border-red-200">
            <div className="flex items-center justify-between text-xs">
              <span>{tEditCreditInfo('balanceLabel', { credits: currentBalance })}</span>
              <Link 
                href={`/${locale}/buy-credits`}
                className="text-red-600 hover:text-red-800 underline font-medium"
              >
                {tEditCreditInfo('buyCreditsButton')}
              </Link>
            </div>
          </div>
        )}
        
        {/* Progress indicator for text edits */}
        {action === 'textEdit' && canEdit && nextThreshold && (
          <div className="mt-2 pt-2 border-t border-current border-opacity-20">
            <div className="flex items-center justify-between text-xs opacity-75">
              <span>{tEditCreditInfo('progressLabel')}</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-current bg-opacity-20 rounded-full h-1">
                  <div 
                    className="bg-current h-1 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, (() => {
                        if (editCount < 5) {
                          // Show progress toward 5 free edits
                          return (editCount / 5) * 100;
                        } else {
                          // Show progress in current paid cycle (edits since last charge)
                          const editsInCurrentCycle = (editCount - 5) % 5;
                          return (editsInCurrentCycle / 5) * 100;
                        }
                      })())}%` 
                    }}
                  />
                </div>
                <span className="text-xs">
                  {editCount < 5 ? `${editCount}/5` : `${(editCount - 5) % 5}/5`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
