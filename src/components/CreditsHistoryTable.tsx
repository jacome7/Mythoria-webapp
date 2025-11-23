'use client';

import { useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { formatDate } from '@/utils/date';

export interface CreditHistoryEntry {
  id: string;
  amount: number;
  creditEventType: string;
  createdAt: string;
  storyId: string | null;
  purchaseId: string | null;
  balanceAfter: number;
}

interface CreditsHistoryTableProps {
  history: CreditHistoryEntry[];
}

export default function CreditsHistoryTable({ history }: CreditsHistoryTableProps) {
  const t = useTranslations('CreditsAndPayments');
  const locale = useLocale();
  const tableEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the end of the table on mount
    if (tableEndRef.current) {
      tableEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, []);

  const formatEventType = (eventType: string) => {
    // We use the keys from the JSON file which match the enum values usually
    // If not, we might need a mapping. Assuming keys match for now based on CreditsDisplay.tsx
    return t(`eventTypes.${eventType}`) || eventType;
  };

  const getAmountColor = (amount: number) => {
    return amount > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="overflow-x-auto max-h-[500px] overflow-y-auto border rounded-lg bg-base-100 shadow-sm">
      <table className="table table-zebra w-full table-pin-rows">
        <thead className="z-10">
          <tr>
            <th className="bg-base-200">{t('table.date')}</th>
            <th className="bg-base-200">{t('table.event')}</th>
            <th className="text-right bg-base-200">{t('table.amount')}</th>
            <th className="text-right bg-base-200">{t('table.balance')}</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <tr key={entry.id}>
              <td className="text-sm whitespace-nowrap">
                {/* Mobile: Short date format */}
                <span className="md:hidden">
                  {formatDate(entry.createdAt, {
                    locale,
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {/* Desktop: Full date format */}
                <span className="hidden md:inline">
                  {formatDate(entry.createdAt, {
                    locale,
                    year: '2-digit',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </td>
              <td
                className="max-w-[100px] md:max-w-[300px] truncate"
                title={formatEventType(entry.creditEventType)}
              >
                {formatEventType(entry.creditEventType)}
              </td>
              <td
                className={`text-right font-mono ${getAmountColor(entry.amount)} whitespace-nowrap`}
              >
                {entry.amount > 0 ? '+' : ''}
                {entry.amount}
              </td>
              <td className="text-right font-mono font-semibold whitespace-nowrap">
                {entry.balanceAfter}
              </td>
            </tr>
          ))}
          {/* Empty row to ensure scrolling to bottom shows the last item clearly if needed, 
              but scrollIntoView on the div below is better */}
        </tbody>
      </table>
      <div ref={tableEndRef} />
    </div>
  );
}
