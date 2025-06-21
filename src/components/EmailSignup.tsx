'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { trackAuth } from '../lib/analytics';

interface EmailSignupProps {
  className?: string;
}

const EmailSignup = ({ className = "" }: EmailSignupProps) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const t = useTranslations('EmailSignup');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
      if (!email.trim()) {
      setMessage(t('validation.emailRequired'));
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });      const data = await response.json();      if (response.ok) {
        // Track lead capture event
        trackAuth.leadCapture({
          form_type: 'newsletter',
          email_provided: !!email.trim(),
          already_registered: data.alreadyRegistered
        });

        if (data.alreadyRegistered) {
          setMessage(t('messages.alreadyRegistered'));
        } else {
          setMessage(t('messages.success'));
        }
        setIsSuccess(true);
        if (data.success) {
          setEmail(''); // Clear email if it's a new signup
        }} else {
        // Handle specific API error messages
        if (data.error === 'Please enter a valid email address') {
          setMessage(t('validation.emailInvalid'));
        } else {
          setMessage(t('errors.general'));
        }
        setIsSuccess(false);
      }    } catch (error) {
      console.error('Email signup error:', error);
      setMessage(t('errors.network'));
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (    <div className={`bg-gradient-to-br from-primary/10 to-secondary/10 p-8 rounded-2xl border border-primary/20 ${className}`}>
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-base-content mb-2">
          🔔 {t('title')}
        </h3>
        <p className="text-base-content/70 text-sm">
          {t('subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('form.placeholder')}
            className="input input-bordered flex-1 focus:input-primary"
            disabled={isLoading}
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary min-w-[120px]"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              t('form.button')
            )}
          </button>
        </div>

        {message && (
          <div className={`alert ${isSuccess ? 'alert-success' : 'alert-error'} text-sm`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              {isSuccess ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
            <span>{message}</span>
          </div>
        )}
      </form>
      
      <div className="text-center mt-4">
        <p className="text-xs text-base-content/50">
          {t('privacy')}
        </p>
      </div>
    </div>
  );
};

export default EmailSignup;
