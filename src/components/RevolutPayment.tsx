'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import RevolutCheckout from '@revolut/checkout';

interface RevolutPaymentProps {
  orderToken: string;
  orderAmount?: number;
  onPaymentSuccess: (result: Record<string, unknown>) => void;
  onPaymentError: (error: Record<string, unknown>) => void;
  onPaymentCancel?: () => void;
  disabled?: boolean;
}

export default function RevolutPayment({
  orderToken,
  orderAmount,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
  disabled = false,
}: RevolutPaymentProps) {
  const tRevolutPayment = useTranslations('RevolutPayment');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const revolutPayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAndInitialize = async () => {
      try {
        if (disabled || !orderToken) {
          return;
        }

        console.log('RevolutPayment: Starting initialization...');
        setIsLoading(true);
        setError(null);

        // Fetch Revolut configuration from API
        console.log('RevolutPayment: Fetching configuration...');
        const configResponse = await fetch('/api/revolut-config');
        if (!configResponse.ok) {
          throw new Error('Failed to fetch Revolut configuration');
        }

        const config = await configResponse.json();
        const { publicKey: publicToken, environment: envMode } = config;
        const isProduction = envMode === 'prod';

        console.log('RevolutPayment: Environment:', {
          isProduction,
          publicToken: publicToken ? 'present' : 'missing',
          orderToken: orderToken ? 'present' : 'missing',
        });

        if (!publicToken) {
          throw new Error('Missing public API key');
        }

        // Initialize RevolutCheckout using the payments method pattern
        const { revolutPay } = await RevolutCheckout.payments({
          publicToken,
          locale: 'en',
          mode: isProduction ? 'prod' : 'sandbox',
        });

        console.log('RevolutPayment: RevolutCheckout initialized with revolutPay:', revolutPay);

        if (!revolutPay) {
          throw new Error('RevolutPay not available');
        }

        // Payment options configuration
        const paymentOptions = {
          currency: 'EUR',
          totalAmount: orderAmount || 0, // Use the order amount from the API
          createOrder: async () => {
            console.log('RevolutPayment: createOrder called with token:', orderToken);
            return { publicId: orderToken };
          },
          redirectUrls: {
            success: `${window.location.origin}${window.location.pathname}?payment=success`,
            failure: `${window.location.origin}${window.location.pathname}?payment=failure`,
            cancel: `${window.location.origin}${window.location.pathname}?payment=cancel`,
          },
          mobileRedirectUrls: {
            success: `${window.location.origin}${window.location.pathname}?payment=success`,
            failure: `${window.location.origin}${window.location.pathname}?payment=failure`,
            cancel: `${window.location.origin}${window.location.pathname}?payment=cancel`,
          },
        };

        console.log('RevolutPayment: Payment options:', paymentOptions);

        // Setup event listeners
        revolutPay.on('payment', (event: { type: string; error?: Error; orderId?: string }) => {
          console.log('RevolutPayment: Payment event received:', event);

          if (!isMounted) return;

          switch (event.type) {
            case 'success':
              console.log('RevolutPayment: Payment successful');
              onPaymentSuccess(event);
              break;
            case 'error':
              console.log('RevolutPayment: Payment error:', event.error);
              onPaymentError(event);
              break;
            case 'cancel':
              console.log('RevolutPayment: Payment cancelled');
              onPaymentCancel?.();
              break;
            default:
              console.log('RevolutPayment: Unknown event type:', event.type);
          }
        });

        // Mount the payment button
        if (revolutPayRef.current && isMounted) {
          console.log('RevolutPayment: Mounting to DOM element:', revolutPayRef.current);
          await revolutPay.mount(revolutPayRef.current, paymentOptions);
          console.log('RevolutPayment: Successfully mounted');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('RevolutPayment: Initialization failed:', error);
        if (isMounted) {
          setError(
            error instanceof Error ? error.message : tRevolutPayment('errors.initializationFailed'),
          );
          setIsLoading(false);
        }
      }
    };

    loadAndInitialize();

    return () => {
      isMounted = false;
    };
  }, [
    orderToken,
    orderAmount,
    disabled,
    onPaymentSuccess,
    onPaymentError,
    onPaymentCancel,
    tRevolutPayment,
  ]);

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-error font-semibold">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Loading State */}
      {isLoading && (
        <div className="bg-base-200 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center space-x-2">
            <span className="loading loading-spinner loading-sm"></span>
            <span>{tRevolutPayment('loading')}</span>
          </div>
        </div>
      )}

      {/* Revolut Pay Button Container */}
      <div
        ref={revolutPayRef}
        className="revolut-pay-container min-h-[50px]"
        style={{ display: isLoading ? 'none' : 'block' }}
      />

      {/* Payment Information */}
      {!isLoading && (
        <div className="text-xs text-gray-600 space-y-1">
          <p>{tRevolutPayment('securityNote')}</p>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>{tRevolutPayment('encryptionNote')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
