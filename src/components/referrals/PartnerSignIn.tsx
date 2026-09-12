'use client';
import { useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
export default function PartnerSignIn() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const t = useTranslations('Referrals');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newAccount, setNewAccount] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(false);
    try {
      if (newAccount) {
        if (!sent) {
          const result = await signUp.create({ emailAddress: email });
          if (result.error) throw result.error;
          const verification = await signUp.verifications.sendEmailCode();
          if (verification.error) throw verification.error;
          setSent(true);
        } else {
          const result = await signUp.verifications.verifyEmailCode({ code });
          if (result.error) throw result.error;
          if (signUp.status !== 'complete') throw new Error('incomplete');
          const final = await signUp.finalize();
          if (final.error) throw final.error;
        }
      } else if (!sent) {
        const result = await signIn.emailCode.sendCode({ emailAddress: email });
        if (result.error) throw result.error;
        setSent(true);
      } else {
        const result = await signIn.emailCode.verifyCode({ code });
        if (result.error) throw result.error;
        if (signIn.status !== 'complete') throw new Error('incomplete');
        const final = await signIn.finalize();
        if (final.error) throw final.error;
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="card bg-base-100 border border-base-300 max-w-md mx-auto">
      <div className="card-body space-y-4">
        <p>{t('inviteRequired')}</p>
        <label>
          <span className="block mb-2">{t('email')}</span>
          <input
            className="input input-bordered w-full"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sent}
            required
          />
        </label>
        {sent && (
          <label>
            <span className="block mb-2">{t('otp')}</span>
            <input
              className="input input-bordered w-full"
              autoComplete="one-time-code"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
        )}
        <div id="clerk-captcha" />
        <button className="btn btn-primary" disabled={busy}>
          {t(sent ? 'verify' : 'sendCode')}
        </button>
        {!sent && (
          <label className="flex gap-3">
            <input
              type="checkbox"
              className="checkbox"
              checked={newAccount}
              onChange={(e) => setNewAccount(e.target.checked)}
            />
            {t('createAccount')}
          </label>
        )}
        {error && (
          <p className="text-error" role="alert">
            {t('error')}
          </p>
        )}
      </div>
    </form>
  );
}
