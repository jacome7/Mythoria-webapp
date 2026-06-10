'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Show } from '@clerk/nextjs';
import { Link } from '@/i18n/routing';

import { FaShoppingCart, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import CartView from '@/components/CartView';
import PaymentSelector from '@/components/PaymentSelector';
import PromotionCodeRedeemer from '@/components/PromotionCodeRedeemer';
import ScrollFadeIn from '@/components/ScrollFadeIn';
import { useCart } from '@/hooks/useCart';
import { trackCommerce } from '@/lib/analytics';
import type { CreditPackage } from '@/types/cart';

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'FaShoppingCart':
    default:
      return <FaShoppingCart />;
  }
};

function BuyCreditsContent() {
  const searchParams = useSearchParams();
  const tBuyCreditsPage = useTranslations('BuyCreditsPage');
  const tPricingPage = useTranslations('PricingPage');
  const tMyStoriesPage = useTranslations('MyStoriesPage');
  const tVoucher = useTranslations('Voucher');
  const locale = useLocale();
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart } = useCart();
  const [isMounted, setIsMounted] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>(
    'idle',
  );
  const [paymentMessage, setPaymentMessage] = useState('');
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const cartItemsRef = useRef<HTMLDivElement>(null);
  const hasProcessedPayment = useRef(false);

  useEffect(() => {
    setIsMounted(true);

    return () => {
      hasProcessedPayment.current = false;
    };
  }, []);

  const getPackageById = (id: number) => {
    return creditPackages.find((pkg) => pkg.id === id);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      const pkg = getPackageById(item.packageId);
      if (!pkg) return sum;
      return sum + (pkg.price / 1.06) * item.quantity;
    }, 0);
  };

  const calculateVAT = (subtotal: number) => subtotal * 0.06;

  const subtotal = calculateSubtotal();
  const vatAmount = calculateVAT(subtotal);
  const total = subtotal + vatAmount;

  useEffect(() => {
    if (!isMounted) return;

    const paymentStatusParam = searchParams?.get('payment') ?? null;

    if (paymentStatusParam === 'stripe_success') {
      const sessionId = searchParams?.get('session_id');
      if (!sessionId || hasProcessedPayment.current) {
        return;
      }

      hasProcessedPayment.current = true;
      setPaymentStatus('processing');
      setPaymentMessage(tBuyCreditsPage('payment.stripeFinalizing'));

      const finalizeStripeCheckout = async () => {
        for (let attempt = 0; attempt < 12; attempt += 1) {
          const response = await fetch(
            `/api/payments/stripe/session?sessionId=${encodeURIComponent(sessionId)}`,
            { cache: 'no-store' },
          );
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || tBuyCreditsPage('errors.paymentFailed'));
          }

          if (data.status === 'completed') {
            const trackingAmountEuros = data.amount ? Number(data.amount) / 100 : total;
            const trackingCredits = Number(data.credits || 0);
            const items =
              cart.length > 0
                ? cart.map((item) => {
                    const pkg = getPackageById(item.packageId);
                    return {
                      item_id: `credit_package_${item.packageId}`,
                      item_name: pkg
                        ? `${pkg.credits} Credits`
                        : `Credit Package ${item.packageId}`,
                      price: pkg ? pkg.price : 0,
                      quantity: item.quantity,
                    };
                  })
                : [
                    {
                      item_id: `credits-${trackingCredits}`,
                      item_name: `${trackingCredits} Credits`,
                      price: trackingAmountEuros,
                      quantity: 1,
                    },
                  ];

            trackCommerce.creditPurchase({
              purchase_amount: trackingAmountEuros,
              credits_purchased: trackingCredits,
              transaction_id: data.orderId,
              payment_method: data.paymentMethodType || 'stripe',
              items,
            });

            setPaymentStatus('success');
            setPaymentMessage(tBuyCreditsPage('payment.success'));
            clearCart();

            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('payment');
            newUrl.searchParams.delete('session_id');
            window.history.replaceState({}, '', newUrl.toString());

            setTimeout(() => {
              hasProcessedPayment.current = false;
              window.location.href = `/${locale}/my-stories`;
            }, 3000);
            return;
          }

          if (['failed', 'cancelled', 'expired'].includes(data.status)) {
            throw new Error(tBuyCreditsPage('errors.paymentFailed'));
          }

          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        setPaymentMessage(tBuyCreditsPage('payment.stripePending'));
      };

      finalizeStripeCheckout().catch((error) => {
        console.error('Stripe checkout finalization failed:', error);
        hasProcessedPayment.current = false;
        setPaymentStatus('error');
        setPaymentMessage(
          error instanceof Error ? error.message : tBuyCreditsPage('errors.paymentFailed'),
        );
      });
    } else if (paymentStatusParam === 'cancel') {
      setPaymentStatus('idle');
      setPaymentMessage('');

      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('payment');
      window.history.replaceState({}, '', newUrl.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, searchParams, tBuyCreditsPage, locale]);

  const fetchCreditPackages = useCallback(async () => {
    try {
      const response = await fetch('/api/pricing/credit-packages');
      if (!response.ok) {
        throw new Error('Failed to fetch credit packages');
      }
      const data = await response.json();
      const sortedPackages = data.packages.sort(
        (a: CreditPackage, b: CreditPackage) => a.price - b.price,
      );
      setCreditPackages(sortedPackages);
    } catch (error) {
      console.error('Error fetching credit packages:', error);
      setPackagesError(tPricingPage('errors.loadingFailed'));
    } finally {
      setPackagesLoading(false);
    }
  }, [tPricingPage]);

  useEffect(() => {
    fetchCreditPackages();
  }, [fetchCreditPackages]);

  useEffect(() => {
    const packageId = searchParams?.get('package') ?? null;
    if (packageId) {
      const id = parseInt(packageId);
      if (creditPackages.find((pkg) => pkg.id === id)) {
        clearCart();
        addToCart(id);
      }
    }
  }, [searchParams, creditPackages, addToCart, clearCart]);

  const scrollToCartItems = () => {
    if (window.innerWidth >= 1024) return;

    if (cartItemsRef.current) {
      const elementRect = cartItemsRef.current.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;

      window.scrollTo({
        top: absoluteElementTop - 20,
        behavior: 'smooth',
      });
    }
  };

  const handleAddToCart = (packageId: number) => {
    addToCart(packageId);
    setTimeout(scrollToCartItems, 100);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert(tBuyCreditsPage('errors.emptyCart'));
      return;
    }

    setIsCreatingOrder(true);
    setPaymentStatus('processing');
    setPaymentMessage(tBuyCreditsPage('payment.stripeRedirecting'));

    try {
      const creditPackages = cart.map((item) => ({
        packageId: item.packageId,
        quantity: item.quantity,
      }));

      const response = await fetch('/api/payments/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creditPackages,
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || tBuyCreditsPage('errors.orderCreationFailed'));
      }

      if (!data.checkoutUrl) {
        throw new Error(tBuyCreditsPage('errors.orderCreationFailed'));
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('Order creation failed:', error);
      setPaymentStatus('error');
      setPaymentMessage(
        error instanceof Error ? error.message : tBuyCreditsPage('errors.orderCreationFailed'),
      );
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const resetPayment = () => {
    setPaymentStatus('idle');
    setPaymentMessage('');
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="container mx-auto px-4 py-12">
        {!isMounted ? (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-4">
              {tBuyCreditsPage('header.title')}
            </h1>
            <div className="flex justify-center items-center min-h-96">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          </div>
        ) : (
          <>
            <Show when="signed-out">
              <div className="text-center space-y-6">
                <h1 className="text-4xl font-bold">{tBuyCreditsPage('header.title')}</h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  {tMyStoriesPage('signedOut.needSignIn')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/sign-in" className="btn btn-primary">
                    {tMyStoriesPage('signedOut.signIn')}
                  </Link>
                  <Link href="/sign-up" className="btn btn-outline">
                    {tMyStoriesPage('signedOut.createAccount')}
                  </Link>
                </div>
              </div>
            </Show>

            <Show when="signed-in">
              <ScrollFadeIn>
                <header className="text-center mb-16">
                  <h1 className="text-5xl font-bold text-primary">
                    {tBuyCreditsPage('header.title')}
                  </h1>
                  <p className="text-xl mt-4 text-gray-700">{tBuyCreditsPage('header.subtitle')}</p>
                </header>
              </ScrollFadeIn>

              <ScrollFadeIn delay={100}>
                <section className="mb-16">
                  <h2 className="text-2xl font-bold mb-6">{tVoucher('sectionHeading')}</h2>
                  <p className="text-base opacity-80 mb-4 max-w-2xl">
                    {tVoucher('sectionSubheading')}
                  </p>
                  <div className="max-w-xl">
                    <PromotionCodeRedeemer />
                  </div>
                </section>
              </ScrollFadeIn>

              <ScrollFadeIn delay={200}>
                <div className="grid lg:grid-cols-2 gap-12">
                  <div>
                    <h2 className="text-2xl font-bold mb-6">{tBuyCreditsPage('packages.title')}</h2>
                    {packagesLoading ? (
                      <div className="flex justify-center items-center py-12">
                        <span className="loading loading-spinner loading-lg"></span>
                      </div>
                    ) : packagesError ? (
                      <div className="alert alert-error">
                        <FaExclamationTriangle />
                        <span>{packagesError}</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {creditPackages.map((pkg) => (
                          <div
                            key={pkg.id}
                            className={`card bg-base-200 shadow-lg border-2 ${
                              pkg.bestValue
                                ? 'border-accent'
                                : pkg.popular
                                  ? 'border-secondary'
                                  : 'border-transparent'
                            }`}
                          >
                            {pkg.bestValue && (
                              <div className="badge badge-accent absolute -top-3 -right-3 p-2">
                                {tBuyCreditsPage('badges.bestValue')}
                              </div>
                            )}
                            {pkg.popular && (
                              <div className="badge badge-secondary absolute -top-3 -right-3 p-2">
                                {tBuyCreditsPage('badges.popular')}
                              </div>
                            )}
                            <div className="card-body p-4 sm:p-8">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center space-x-2 sm:space-x-4">
                                  <div className="text-2xl sm:text-3xl text-primary">
                                    {getIconComponent(pkg.icon)}
                                  </div>
                                  <div>
                                    <h3 className="text-base sm:text-xl font-bold whitespace-nowrap">
                                      {pkg.credits} {tPricingPage('creditPackages.credits')}
                                    </h3>
                                    <p className="text-base sm:text-lg font-semibold text-primary">
                                      €{pkg.price.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleAddToCart(pkg.id)}
                                  className="btn btn-primary btn-sm sm:btn-md whitespace-nowrap"
                                >
                                  <span className="hidden sm:inline">
                                    {tBuyCreditsPage('packages.addToCart')}
                                  </span>
                                  <span className="sm:hidden">
                                    {tBuyCreditsPage('packages.addToCartShort')}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <CartView
                      cart={cart}
                      creditPackages={creditPackages}
                      tBuyCreditsPage={tBuyCreditsPage}
                      tPricingPage={tPricingPage}
                      updateQuantity={updateQuantity}
                      removeFromCart={removeFromCart}
                      subtotal={subtotal}
                      vatAmount={vatAmount}
                      total={total}
                      cartItemsRef={cartItemsRef}
                    />

                    {paymentStatus !== 'idle' && (
                      <div
                        className={`mb-6 ${
                          paymentStatus === 'success'
                            ? 'alert alert-success'
                            : paymentStatus === 'error'
                              ? 'bg-error/10 border border-error/20 rounded-lg p-4'
                              : 'alert alert-info'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {paymentStatus === 'success' && <FaCheckCircle />}
                          {paymentStatus === 'error' && (
                            <FaExclamationTriangle className="text-error" />
                          )}
                          {paymentStatus === 'processing' && (
                            <span className="loading loading-spinner loading-sm"></span>
                          )}
                          <span className={paymentStatus === 'error' ? 'text-error' : ''}>
                            {paymentMessage}
                          </span>
                        </div>
                        {paymentStatus === 'error' && (
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-3">
                            <button onClick={resetPayment} className="btn btn-sm btn-outline">
                              {tBuyCreditsPage('actions.tryAgain')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {cart.length > 0 && paymentStatus !== 'success' && (
                      <div className="bg-base-200 rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-bold mb-4">
                          {tBuyCreditsPage('payment.title')}
                        </h3>
                        <PaymentSelector t={tBuyCreditsPage} />
                      </div>
                    )}

                    {cart.length > 0 && paymentStatus !== 'success' && (
                      <button
                        disabled={isCreatingOrder}
                        onClick={handlePlaceOrder}
                        className="btn btn-primary btn-lg w-full"
                      >
                        {isCreatingOrder ? (
                          <>
                            <span className="loading loading-spinner loading-sm"></span>
                            {tBuyCreditsPage('actions.creatingOrder')}
                          </>
                        ) : (
                          <>
                            {tBuyCreditsPage('actions.proceedToPayment')} - €{total.toFixed(2)}
                          </>
                        )}
                      </button>
                    )}

                    <div className="mt-6 text-center">
                      <Link href="/pricing" className="btn btn-outline">
                        {tBuyCreditsPage('actions.backToPricing')}
                      </Link>
                    </div>
                  </div>
                </div>
              </ScrollFadeIn>
            </Show>
          </>
        )}
      </div>
    </div>
  );
}

export default function BuyCreditsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BuyCreditsContent />
    </Suspense>
  );
}

function LoadingFallback() {
  const tBuyCreditsPage = useTranslations('BuyCreditsPage');
  return <div>{tBuyCreditsPage('buyCredits')}</div>;
}
