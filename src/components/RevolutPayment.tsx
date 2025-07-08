'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface RevolutPaymentProps {
  orderToken: string;
  onPaymentSuccess: (result: Record<string, unknown>) => void;
  onPaymentError: (error: Record<string, unknown>) => void;
  onPaymentCancel?: () => void;
  disabled?: boolean;
}

interface RevolutPaymentInstance {
  mount: (selector: string | HTMLElement, options: PaymentOptions) => Promise<void>;
  destroy: () => void;
  on: (event: string, callback: (data: Record<string, unknown>) => void) => void;
}

interface PaymentOptions {
  currency?: string;
  totalAmount?: number;
  createOrder: () => Promise<{ publicId: string }>;
  mobileRedirectUrls?: {
    success: string;
    failure: string;
    cancel: string;
  };
}

interface RevolutCheckout {
  payments: (config: { 
    publicToken: string;
    mode?: 'sandbox' | 'prod';
    locale?: string;
  }) => Promise<{
    revolutPay: RevolutPaymentInstance;
    cardField: RevolutPaymentInstance;
  }>;
}

declare global {
  interface Window {
    RevolutCheckout?: RevolutCheckout;
  }
}

export default function RevolutPayment({
  orderToken,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
  disabled = false,
}: RevolutPaymentProps) {
  const t = useTranslations('RevolutPayment');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const revolutPayRef = useRef<HTMLDivElement>(null);
  const cardFieldRef = useRef<HTMLDivElement>(null);
  const revolutInstance = useRef<RevolutPaymentInstance | null>(null);
  const cardInstance = useRef<RevolutPaymentInstance | null>(null);

  // Load Revolut SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.RevolutCheckout) {
      // IMPORTANT: For Sandbox testing, we must use the production embed.js URL
      // The sandbox embed.js URL (sandbox-merchant.revolut.com/embed.js) returns 404
      // But we still use sandbox API endpoints for actual API calls
      const nodeEnv = process.env.NODE_ENV;
      console.log('RevolutPayment: NODE_ENV:', nodeEnv);
      
      const scriptUrl = 'https://merchant.revolut.com/embed.js'; // Always use production embed.js
        
      console.log('RevolutPayment: Loading SDK from:', scriptUrl);
        
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;

      // Explicitly set sandbox mode via script attribute for robustness
      if (process.env.NODE_ENV === 'development') {
        script.setAttribute('data-sandbox', 'true');
      }

      script.onload = () => {
        console.log('RevolutPayment: SDK loaded successfully');
        setScriptLoaded(true);
      };
      script.onerror = () => {
        console.error('RevolutPayment: SDK failed to load');
        setError(t('errors.sdkLoadFailed'));
        setIsLoading(false);
      };
      document.head.appendChild(script);

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    } else if (window.RevolutCheckout) {
      console.log('RevolutPayment: SDK already loaded');
      setScriptLoaded(true);
    }
  }, [t]);

  // Initialize payment widgets
  useEffect(() => {
    if (!scriptLoaded || !window.RevolutCheckout || !orderToken || disabled) {
      console.log('RevolutPayment: Skipping initialization', {
        scriptLoaded,
        hasRevolutCheckout: !!window.RevolutCheckout,
        orderToken: orderToken ? 'present' : 'missing',
        disabled
      });
      return;
    }

    const initializePayment = async () => {
      try {
        console.log('RevolutPayment: Starting initialization with token:', orderToken);
        setIsLoading(true);
        setError(null);

        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        const checkout = window.RevolutCheckout!;
        console.log('RevolutPayment: Creating payment instance...');
        
        // Configuration based on official Revolut documentation
        const publicToken = process.env.NEXT_PUBLIC_REVOLUT_API_PUBLIC_KEY || 'pk_jQ1Tq5KjbUt0f0LyScOcLgIwYRr7i783jaRBE94OW5L0rZxq';
        const configOptions: { 
          publicToken: string;
          locale: string;
          mode?: 'sandbox' | 'prod';
        } = { 
          publicToken,
          locale: 'en'
        };
        
        // For sandbox testing, add mode parameter
        if (process.env.NODE_ENV === 'development') {
          configOptions.mode = 'sandbox';
          console.log('RevolutPayment: Using sandbox mode');
        }
        
        console.log('RevolutPayment: Config options:', configOptions);
        console.log('RevolutPayment: Environment variables check:', {
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PUBLIC_REVOLUT_API_PUBLIC_KEY: process.env.NEXT_PUBLIC_REVOLUT_API_PUBLIC_KEY ? 'present' : 'missing',
          publicToken: publicToken ? 'present' : 'missing',
        });

        // Add network request monitoring
        console.log('RevolutPayment: Monitoring network requests...');
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          console.log('RevolutPayment: SDK making request to:', args[0]);
          return originalFetch.apply(this, args);
        };
        
        const instance = await checkout.payments(configOptions);
        
        // Restore original fetch
        window.fetch = originalFetch;
        
        console.log('RevolutPayment: Payment instance created:', instance);
        
        // Debug: Log all available properties
        console.log('RevolutPayment: Available payment methods:', Object.keys(instance));
        console.log('RevolutPayment: revolutPay available:', !!instance.revolutPay);
        console.log('RevolutPayment: cardField available:', !!instance.cardField);

        // Setup event listeners
        const setupEventListeners = (paymentInstance: RevolutPaymentInstance) => {
          paymentInstance.on('payment:completed', (data: Record<string, unknown>) => {
            console.log('RevolutPayment: Payment completed event:', data);
            onPaymentSuccess(data);
          });

          paymentInstance.on('payment:failed', (data: Record<string, unknown>) => {
            console.log('RevolutPayment: Payment failed event:', data);
            onPaymentError(data);
          });

          paymentInstance.on('payment:cancel', (data: Record<string, unknown>) => {
            console.log('RevolutPayment: Payment cancelled event:', data);
            onPaymentCancel?.();
          });

          paymentInstance.on('payment:processing', (data: Record<string, unknown>) => {
            console.log('RevolutPayment: Payment processing event:', data);
            // Note: We could notify parent here if needed, but don't disable the widget
            // onPaymentProcessing?.(data);
          });

          // Add more event listeners for debugging
          paymentInstance.on('payment:error', (data: Record<string, unknown>) => {
            console.log('RevolutPayment: Payment error event:', data);
          });

          paymentInstance.on('payment:redirect', (data: Record<string, unknown>) => {
            console.log('RevolutPayment: Payment redirect event:', data);
          });

          // Listen for any other events
          const originalOn = paymentInstance.on;
          paymentInstance.on = function(event: string, callback: (data: Record<string, unknown>) => void) {
            console.log('RevolutPayment: Registering event listener for:', event);
            return originalOn.call(this, event, (data: Record<string, unknown>) => {
              console.log(`RevolutPayment: Event '${event}' triggered:`, data);
              callback(data);
            });
          };
        };

        // Set loading to false first so DOM elements are rendered
        setIsLoading(false);

        // Wait a bit more for DOM to be fully rendered
        await new Promise(resolve => setTimeout(resolve, 200));

        // Debug DOM state
        console.log('RevolutPayment: DOM state after loading:', {
          revolutPayRef: revolutPayRef.current,
          revolutPayRefClass: revolutPayRef.current?.className,
          revolutPayRefParent: revolutPayRef.current?.parentElement,
          cardFieldRef: cardFieldRef.current,
          cardFieldRefClass: cardFieldRef.current?.className,
          cardFieldRefParent: cardFieldRef.current?.parentElement,
        });

        // Prepare payment options
        const paymentOptions: PaymentOptions = {
          currency: 'EUR', // Explicitly set to EUR to match backend order
          totalAmount: 1000, // This will be overridden by the createOrder response
          createOrder: async () => {
            console.log('RevolutPayment: createOrder called, returning token:', orderToken);
            // Add debug info about what we're returning
            const result = { publicId: orderToken };
            console.log('RevolutPayment: createOrder returning:', result);
            return result;
          },
          mobileRedirectUrls: {
            success: `${window.location.origin}/payment-success`,
            failure: `${window.location.origin}/payment-failure`,
            cancel: `${window.location.origin}/payment-cancel`,
          }
        };

        console.log('RevolutPayment: Payment options configured:', paymentOptions);

        // Try to mount Revolut Pay first (for existing Revolut customers)
        try {
          console.log('RevolutPayment: Attempting to get revolutPay instance...');
          revolutInstance.current = instance.revolutPay;
          console.log('RevolutPayment: RevolutPay instance:', revolutInstance.current);
          console.log('RevolutPayment: RevolutPay ref:', revolutPayRef.current);
          
          if (revolutInstance.current && revolutPayRef.current) {
            setupEventListeners(revolutInstance.current);
            console.log('RevolutPayment: Attempting to mount Revolut Pay to element:', revolutPayRef.current);
            await revolutInstance.current.mount(revolutPayRef.current, paymentOptions);
            console.log('RevolutPayment: Revolut Pay mounted successfully');
          } else {
            console.log('RevolutPayment: RevolutPay instance or ref not available');
            throw new Error('RevolutPay not available');
          }
        } catch (error) {
          console.log('RevolutPayment: Revolut Pay not available, falling back to card field:', error);
          
          // Fall back to card field
          try {
            console.log('RevolutPayment: Attempting to get cardField instance...');
            cardInstance.current = instance.cardField;
            console.log('RevolutPayment: CardField instance:', cardInstance.current);
            console.log('RevolutPayment: CardField ref:', cardFieldRef.current);
            
            if (cardInstance.current && cardFieldRef.current) {
              setupEventListeners(cardInstance.current);
              console.log('RevolutPayment: Attempting to mount card field to element:', cardFieldRef.current);
              await cardInstance.current.mount(cardFieldRef.current, paymentOptions);
              console.log('RevolutPayment: Card field mounted successfully');
            } else {
              console.log('RevolutPayment: CardField instance or ref not available');
              throw new Error('CardField not available');
            }
          } catch (cardError) {
            console.error('RevolutPayment: Failed to mount card field:', cardError);
            throw cardError;
          }
        }

        console.log('RevolutPayment: Initialization completed successfully');
      } catch (error) {
        console.error('RevolutPayment: Failed to initialize Revolut payment:', error);
        setError(t('errors.initializationFailed'));
        setIsLoading(false);
      }
    };

    initializePayment();

    // Cleanup on unmount
    return () => {
      try {
        // The Revolut SDK uses `destroy()` to unmount, not `unmount()`
        if (revolutInstance.current) {
          console.log('RevolutPayment: Destroying Revolut Pay instance');
          revolutInstance.current.destroy?.();
          revolutInstance.current = null;
        }
        if (cardInstance.current) {
          console.log('RevolutPayment: Destroying Card Field instance');
          cardInstance.current.destroy?.();
          cardInstance.current = null;
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
  }, [scriptLoaded, orderToken, disabled, onPaymentSuccess, onPaymentError, onPaymentCancel, t]);

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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
            <span>{t('loading')}</span>
          </div>
        </div>
      )}

      {/* Revolut Pay Button (for existing Revolut customers) */}
      {!isLoading && (
        <div 
          ref={revolutPayRef}
          className="revolut-pay-container min-h-[50px]"
        />
      )}

      {/* Card Field (fallback for new customers) */}
      {!isLoading && (
        <div 
          ref={cardFieldRef}
          className="revolut-card-field min-h-[200px]"
        />
      )}

      {/* Payment Information */}
      {!isLoading && (
        <div className="text-xs text-gray-600 space-y-1">
          <p>{t('securityNote')}</p>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>{t('encryptionNote')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
