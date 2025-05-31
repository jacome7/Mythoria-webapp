'use client';

import { useState } from 'react';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creditHistory, setCreditHistory] = useState<CreditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(credits);

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
      'initialCredit': 'Initial Credit',
      'creditPurchase': 'Credit Purchase',
      'eBookGeneration': 'eBook Generation',
      'audioBookGeneration': 'AudioBook Generation',
      'printOrder': 'Print Order',
      'refund': 'Refund',
      'voucher': 'Voucher',
      'promotion': 'Promotion'
    };
    return eventTypes[eventType] || eventType;
  };

  const getAmountColor = (amount: number) => {
    return amount > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <>
      <button 
        className="btn btn-outline btn-secondary"
        onClick={handleOpenModal}
      >
        Credits available: {credits}
      </button>

      {/* Credit History Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">Credit History</h3>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-96">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Event Type</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Balance</th>
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
                    <span className="text-lg font-semibold">Current Available Balance:</span>
                    <span className="text-xl font-bold text-primary">{currentBalance} credits</span>
                  </div>
                </div>
              </>
            )}

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
