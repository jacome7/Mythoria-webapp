'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface CreditHistoryEntry {
  id: string;
  amount: number;
  creditEventType: string;
  createdAt: string;
  storyId: string | null;
  purchaseId: string | null;
  balanceAfter: number;
}

interface CreditsDisplayProps {
  credits: number;
}

export default function CreditsDisplay({ credits }: CreditsDisplayProps) {
  const t = useTranslations('Components.CreditsDisplay');
  const tCommon = useTranslations('common');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creditHistory, setCreditHistory] = useState<CreditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(credits);

  // Sync the credits prop with internal state when it changes
  useEffect(() => {
    setCurrentBalance(credits);
  }, [credits]);

  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setLoading(true);
    
    try {
      const response = await fetch('/api/my-credits');
      if (response.ok) {
        const data = await response.json();
        setCreditHistory(data.creditHistory);
        setCurrentBalance(data.currentBalance);
      }
    } catch (error) {
      console.error('Error fetching credit history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const formatEventType = (eventType: string) => {
    const eventTypes: { [key: string]: string } = {
      'initialCredit': t('eventTypes.initialCredit'),
      'creditPurchase': t('eventTypes.creditPurchase'),
      'eBookGeneration': t('eventTypes.eBookGeneration'),
      'audioBookGeneration': t('eventTypes.audioBookGeneration'),
      'printOrder': t('eventTypes.printOrder'),
      'refund': t('eventTypes.refund'),
      'voucher': t('eventTypes.voucher'),
      'promotion': t('eventTypes.promotion')
    };
    return eventTypes[eventType] || eventType;
  };

  const getAmountColor = (amount: number) => {
    return amount > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <>      <button 
        className="btn btn-outline btn-secondary"
        onClick={handleOpenModal}
      >
        {t('button').replace('{credits}', currentBalance.toString())}
      </button>

      {/* Credit History Modal */}
      {isModalOpen && (
        <div className="modal modal-open">          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">{t('creditHistory')}</h3>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-96">
                  <table className="table table-zebra w-full">                    <thead>
                      <tr>
                        <th>{t('headers.date')}</th>
                        <th>{t('headers.eventType')}</th>
                        <th className="text-right">{t('headers.amount')}</th>
                        <th className="text-right">{t('headers.balance')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditHistory.map((entry) => (
                        <tr key={entry.id}>
                          <td className="text-sm">{formatDate(entry.createdAt)}</td>
                          <td>{formatEventType(entry.creditEventType)}</td>
                          <td className={`text-right font-mono ${getAmountColor(entry.amount)}`}>
                            {entry.amount > 0 ? '+' : ''}{entry.amount}
                          </td>
                          <td className="text-right font-mono font-semibold">
                            {entry.balanceAfter}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                  <div className="mt-6 p-4 bg-base-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">{t('currentBalance')}</span>
                    <span className="text-xl font-bold text-primary">{currentBalance} {t('credits')}</span>
                  </div>
                </div>
              </>
            )}            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setIsModalOpen(false)}
              >
                {tCommon('Actions.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
