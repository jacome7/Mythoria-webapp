'use client';

import { FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface MbwayPaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number; // price in EUR
  paymentCode: string; // e.g. #F4D5
}

// Simple Portal-less modal using DaisyUI dialog pattern
export default function MbwayPaymentModal({
  open,
  onClose,
  amount,
  paymentCode,
}: MbwayPaymentModalProps) {
  const t = useTranslations('MbwayModal');
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 px-4 py-10 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mbway-modal-title"
    >
      <div className="w-full max-w-xl">
        <div className="card bg-base-100 shadow-2xl border border-base-300">
          <div className="card-body space-y-4">
            <div className="flex items-start gap-3">
              <div className="text-primary text-3xl mt-1">
                <FaInfoCircle />
              </div>
              <div>
                <h2 id="mbway-modal-title" className="card-title text-2xl leading-tight">
                  {t('title')}
                </h2>
                <p className="text-base text-base-content/80 mt-2">{t('intro')}</p>
              </div>
            </div>

            <div className="rounded-lg bg-base-200 p-4 grid gap-4">
              <InfoBlock label={t('fields.amount')} value={`€${amount.toFixed(2)}`} />
              <InfoBlock
                label={t('fields.phone')}
                value={<span className="font-mono tracking-wide">918 957 895</span>}
              />
              <InfoBlock
                label={t('fields.code')}
                value={<span className="font-mono tracking-wide text-primary">{paymentCode}</span>}
              />
            </div>

            <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-md p-3 text-sm">
              <FaExclamationTriangle className="text-warning mt-0.5" />
              <p className="leading-snug">
                <strong>{t('warning.title')}</strong> {t('warning.body')}
              </p>
            </div>

            <p className="text-base leading-relaxed">{t('footnote')}</p>

            <div className="pt-2 flex justify-end">
              <button onClick={onClose} className="btn btn-primary" autoFocus>
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid sm:grid-cols-3 gap-2 items-start">
      <div className="sm:text-right text-sm font-medium text-base-content/70 pt-1">{label}:</div>
      <div className="sm:col-span-2 text-base font-semibold">{value}</div>
    </div>
  );
}
