"use client";
import React, { useState } from 'react';
import { FaTicketAlt } from 'react-icons/fa';
// Using next-intl directly (pattern consistent with other components like BillingInformation/CreditsDisplay)
import { useTranslations } from 'next-intl';

interface Props {
  onRedeemed?: (delta: number, newBalance: number) => void;
  compact?: boolean;
}

export const PromotionCodeRedeemer: React.FC<Props> = ({ onRedeemed, compact }) => {
  const tVoucher = useTranslations('Voucher');
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCode(event.target.value);
  };

  async function apply() {
    if (!code.trim()) return;
    setStatus('loading');
    setMessage(tVoucher('checking'));
    try {
      const res = await fetch('/api/codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(tVoucher('invalid'));
        return;
      }
  setStatus('success');
  // Always localize success client-side to respect current locale.
  setMessage(tVoucher('success', { credits: data.creditsGranted, code: data.code }));
      onRedeemed?.(data.creditsGranted, data.newBalance);
  } catch {
      setStatus('error');
      setMessage(tVoucher('invalid'));
    }
  }

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)} className="link link-primary flex items-center gap-2">
        <FaTicketAlt /> {tVoucher('haveCode')}
      </button>
    );
  }

  return (
    <div className={`mt-2 ${compact ? '' : 'p-3 rounded-md bg-base-200'}`}>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={code}
          onChange={handleCodeChange}
          placeholder={tVoucher('placeholder')}
          className="input input-bordered input-sm flex-1"
          disabled={status === 'loading' || status === 'success'}
        />
        <button
          onClick={apply}
          className="btn btn-primary btn-sm"
          disabled={status === 'loading' || status === 'success'}
        >
          {tVoucher('apply')}
        </button>
      </div>
      {status !== 'idle' && (
        <div
          className={`mt-2 text-sm ${
            status === 'success'
              ? 'text-primary'
              : status === 'error'
              ? 'text-error'
              : 'opacity-80'
          }`}
          aria-live="polite"
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default PromotionCodeRedeemer;
