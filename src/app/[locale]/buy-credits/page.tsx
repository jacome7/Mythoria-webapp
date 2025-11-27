'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { SignedIn, SignedOut } from '@clerk/nextjs';

import { FaShoppingCart, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import BillingInformation from '@/components/BillingInformation';
import CartView from '@/components/CartView';
import PaymentSelector from '@/components/PaymentSelector';
import RevolutPayment from '@/components/RevolutPayment';
import MbwayPaymentModal from '@/components/MbwayPaymentModal';
import PromotionCodeRedeemer from '@/components/PromotionCodeRedeemer';
import ScrollFadeIn from '@/components/ScrollFadeIn';
import { useCart } from '@/hooks/useCart';
import { trackCommerce } from '@/lib/analytics';
import { mapRevolutError } from '@/utils/payment/revolut-error-mapping';
import type { CreditPackage } from '@/types/cart';

// Helper function to convert icon string to React component
const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'FaShoppingCart':
    default:
      return <FaShoppingCart />;
  }
};

// Separate component for search params to handle suspense
function BuyCreditsContent() {
  const searchParams = useSearchParams();
  const tBuyCreditsPage = useTranslations('BuyCreditsPage');
  const tPricingPage = useTranslations('PricingPage');
  const tMyStoriesPage = useTranslations('MyStoriesPage');
  const tRevolutPayment = useTranslations('RevolutPayment');
  const tVoucher = useTranslations('Voucher');
  const locale = useLocale();
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart } = useCart();
  const [selectedPayment, setSelectedPayment] = useState<string>('revolut');
  const [isMounted, setIsMounted] = useState(false);
  const [orderToken, setOrderToken] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState<number | null>(null);
  const [orderCredits, setOrderCredits] = useState<number | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>(
    'idle',
  );
  const [paymentMessage, setPaymentMessage] = useState<string>('');
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  // MB Way modal state
  const [showMbwayModal, setShowMbwayModal] = useState(false);
  const [mbwayPaymentCode, setMbwayPaymentCode] = useState<string>('#XXXX');
  const [mbwayAmount, setMbwayAmount] = useState<number>(0);

  // Ref for cart items section
  const cartItemsRef = useRef<HTMLDivElement>(null);

  // Ref to track if we've already processed the payment success
  const hasProcessedPayment = useRef(false);

  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);

    // Reset processed flag on mount (e.g., when coming back to page)
    return () => {
      hasProcessedPayment.current = false;
    };
  }, []);

  // Check for Revolut error parameters in URL
  useEffect(() => {
    if (!isMounted) return;

    const revolutOrderId = searchParams?.get('_rp_oid') ?? null;
    const revolutFailureReason = searchParams?.get('_rp_fr') ?? null;
    const paymentStatus = searchParams?.get('payment') ?? null;

    if (revolutOrderId && revolutFailureReason) {
      console.log('Revolut error parameters:', {
        revolutOrderId,
        revolutFailureReason,
      });

      const errorCode = mapRevolutError(revolutFailureReason);

      console.log('Mapped error code:', errorCode);

      // Get the localized error message
      let errorMessage: string;

      try {
        // Use a safe translation lookup with fallback
        if (errorCode && errorCode !== 'unknown') {
          try {
            const translatedMessage = tRevolutPayment(`errors.${errorCode}`);
            // Check if translation was successful (doesn't contain the key path)
            if (!translatedMessage.includes('RevolutPayment.errors.')) {
              errorMessage = translatedMessage;
            } else {
              throw new Error('Translation not found');
            }
          } catch {
            // Fallback to the original error message if translation fails
            errorMessage = revolutFailureReason;
          }
        } else {
          // Use unknown error translation or fallback to original message
          try {
            const unknownMessage = tRevolutPayment('errors.unknown');
            errorMessage = unknownMessage.includes('RevolutPayment.errors.')
              ? revolutFailureReason
              : unknownMessage;
          } catch {
            errorMessage = revolutFailureReason;
          }
        }
      } catch (error) {
        console.warn('Translation lookup failed for error:', errorCode, error);
        // Ultimate fallback to the original error message
        errorMessage = revolutFailureReason;
      }

      setPaymentStatus('error');
      setPaymentMessage(errorMessage);

      // Clean up the URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('_rp_oid');
      newUrl.searchParams.delete('_rp_fr');
      newUrl.searchParams.delete('payment');
      window.history.replaceState({}, '', newUrl.toString());
    } else if (paymentStatus === 'success') {
      // Prevent processing the same payment multiple times
      if (hasProcessedPayment.current) {
        return;
      }

      // Mark as processed immediately to prevent duplicate tracking
      hasProcessedPayment.current = true;

      // Get purchase data from URL parameters
      const purchaseAmount = searchParams?.get('amount');
      const purchaseCredits = searchParams?.get('credits');
      const transactionId = searchParams?.get('_rp_oid');

      setPaymentStatus('success');
      setPaymentMessage(tBuyCreditsPage('payment.success'));

      // Track credit purchase in analytics using URL parameters
      if (purchaseAmount && purchaseCredits) {
        const trackingAmountCents = parseFloat(purchaseAmount);
        const trackingCredits = parseInt(purchaseCredits, 10);

        if (trackingAmountCents > 0 && trackingCredits > 0) {
          // Convert cents to euros for analytics (500 cents = 5.00 euros)
          const trackingAmountEuros = trackingAmountCents / 100;

          trackCommerce.creditPurchase({
            purchase_amount: trackingAmountEuros,
            credits_purchased: trackingCredits,
            transaction_id: transactionId || undefined,
          });
        }
      }

      // Clear cart and redirect
      clearCart();
      setOrderToken(null);

      // Clean up URL and redirect after short delay
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('payment');
      newUrl.searchParams.delete('amount');
      newUrl.searchParams.delete('credits');
      window.history.replaceState({}, '', newUrl.toString());

      setTimeout(() => {
        // Reset the processed flag before navigating away
        hasProcessedPayment.current = false;
        window.location.href = `/${locale}/my-stories`;
      }, 3000);
    } else if (paymentStatus === 'cancel') {
      // Handle payment cancellation
      setPaymentStatus('idle');
      setPaymentMessage('');
      setOrderToken(null);
      setOrderAmount(null);

      // Clean up URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('payment');
      window.history.replaceState({}, '', newUrl.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, searchParams, tRevolutPayment, tBuyCreditsPage, locale]);

  // Fetch credit packages from API (like pricing page)
  const fetchCreditPackages = useCallback(async () => {
    try {
      const response = await fetch('/api/pricing/credit-packages');
      if (!response.ok) {
        throw new Error('Failed to fetch credit packages');
      }
      const data = await response.json();
      // Sort packages by price ascending
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

  // Pre-select package if coming from pricing page
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

  // Function to scroll to cart items on mobile
  const scrollToCartItems = () => {
    // Only scroll on mobile/tablet (< lg breakpoint, which is 1024px)
    if (window.innerWidth >= 1024) return;

    if (cartItemsRef.current) {
      const element = cartItemsRef.current;
      const elementRect = element.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;
      const offset = 20; // Small offset for better UX

      window.scrollTo({
        top: absoluteElementTop - offset,
        behavior: 'smooth',
      });
    }
  };

  const handleAddToCart = (packageId: number) => {
    addToCart(packageId);

    // Scroll to cart items on mobile after a short delay to allow state update
    setTimeout(() => {
      scrollToCartItems();
    }, 100);
  };

  const getPackageById = (id: number) => {
    return creditPackages.find((pkg) => pkg.id === id);
  };

  const calculateSubtotal = () => {
    // Prices in the database include VAT, so we need to extract the price without VAT
    return cart.reduce((total, item) => {
      const pkg = getPackageById(item.packageId);
      if (!pkg) return total;
      // Remove VAT from price: priceWithoutVAT = priceWithVAT / 1.06
      const priceWithoutVAT = pkg.price / 1.06;
      return total + priceWithoutVAT * item.quantity;
    }, 0);
  };

  const calculateVAT = (subtotal: number) => {
    // VAT is 6% of the price without VAT
    return subtotal * 0.06;
  };

  const subtotal = calculateSubtotal();
  const vatAmount = calculateVAT(subtotal);
  const total = subtotal + vatAmount;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert(tBuyCreditsPage('errors.emptyCart'));
      return;
    }

    setIsCreatingOrder(true);
    setPaymentMessage(tBuyCreditsPage('payment.creatingOrder'));

    try {
      // Prepare credit packages for API
      const creditPackages = cart.map((item) => ({
        packageId: item.packageId,
        quantity: item.quantity,
      }));

      let response;

      if (selectedPayment === 'mbway') {
        // Create MB Way payment request
        response = await fetch('/api/payments/mbway', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creditPackages,
            locale: locale,
          }),
        });
      } else {
        // Create payment order for other methods
        response = await fetch('/api/payments/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creditPackages,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || tBuyCreditsPage('errors.orderCreationFailed'));
      }

      console.log('Order created successfully:', data);

      if (selectedPayment === 'mbway') {
        // Backend returns ticketNumber (e.g., 'A5CD'); display with leading '#'
        const rawCode: string | undefined = data.ticketNumber || data.ticketId || data.paymentCode;
        const formattedCode = rawCode ? `#${rawCode.replace(/^#/, '')}` : '#----';
        setMbwayPaymentCode(formattedCode);
        setMbwayAmount(data.amount ?? total);
        setShowMbwayModal(true);

        // Track MB Way purchase intent for analytics
        // Note: This tracks when user initiates payment, not when it's completed
        // MB Way requires manual confirmation, so we track the intent immediately

        // data.amount from MBWay API is in Euros (e.g. 5.00), unlike Revolut which uses cents
        const amountEuros = data.amount ?? total;

        const credits =
          data.credits ||
          cart.reduce((sum, item) => {
            const pkg = getPackageById(item.packageId);
            return sum + (pkg ? pkg.credits * item.quantity : 0);
          }, 0);

        // Construct items for GA4
        const items = cart.map((item) => {
          const pkg = getPackageById(item.packageId);
          return {
            item_id: `credit_package_${item.packageId}`,
            item_name: pkg ? `${pkg.credits} Credits` : `Credit Package ${item.packageId}`,
            price: pkg ? pkg.price : 0,
            quantity: item.quantity,
          };
        });

        trackCommerce.creditPurchase({
          purchase_amount: amountEuros,
          credits_purchased: credits,
          transaction_id: data.orderId || data.ticketNumber,
          payment_method: 'mbway',
          items,
        });

        // We intentionally do not mark payment as success yet; it's pending manual action
        setPaymentStatus('idle');
        setPaymentMessage('');
      } else {
        // Store order details for other payment methods
        setOrderToken(data.orderToken);
        setOrderAmount(data.amount);
        setOrderCredits(data.credits);
        setPaymentMessage(tBuyCreditsPage('payment.orderCreated'));
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      setPaymentStatus('error');

      let errorMessage =
        error instanceof Error ? error.message : tBuyCreditsPage('errors.orderCreationFailed');
      let contactUrl = '';

      // Check if the error includes a contact URL (for MB Way failures)
      if (error instanceof Error && error.message.includes('contactUrl')) {
        try {
          const errorData = JSON.parse(error.message);
          contactUrl = errorData.contactUrl;
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If parsing fails, use the original error message
        }
      }

      setPaymentMessage(
        contactUrl ? `${errorMessage} ${tBuyCreditsPage('errors.contactSupport')} ` : errorMessage,
      );

      // Store contact URL for the "Contact Support" button
      if (contactUrl) {
        (window as Window & { mbwayErrorContactUrl?: string }).mbwayErrorContactUrl = contactUrl;
      }
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handlePaymentSuccess = (result: Record<string, unknown>) => {
    console.log('🎉 [Buy Credits] handlePaymentSuccess called with result:', result);
    console.log('🛒 [Buy Credits] Current cart:', cart);
    console.log('💵 [Buy Credits] Total amount:', total);

    // Calculate total credits purchased for analytics
    const totalCredits = cart.reduce((total, item) => {
      const pkg = getPackageById(item.packageId);
      return total + (pkg ? pkg.credits * item.quantity : 0);
    }, 0);

    // Construct items for GA4
    const items = cart.map((item) => {
      const pkg = getPackageById(item.packageId);
      return {
        item_id: `credit_package_${item.packageId}`,
        item_name: pkg ? `${pkg.credits} Credits` : `Credit Package ${item.packageId}`,
        price: pkg ? pkg.price : 0,
        quantity: item.quantity,
      };
    });

    console.log('📊 [Buy Credits] Tracking credit purchase:', {
      purchase_amount: total,
      credits_purchased: totalCredits,
      items,
    });

    // Track credit purchase in analytics
    trackCommerce.creditPurchase({
      purchase_amount: total,
      credits_purchased: totalCredits,
      items,
    });

    console.log('✅ [Buy Credits] Analytics tracking completed');

    setPaymentStatus('success');
    setPaymentMessage(tBuyCreditsPage('payment.success'));

    // Clear cart and reset form
    clearCart();
    setOrderToken(null);

    // Redirect to my stories page after a short delay
    setTimeout(() => {
      window.location.href = `/${locale}/my-stories`;
    }, 3000);
  };

  const handlePaymentError = (error: Record<string, unknown>) => {
    console.error('Payment failed:', error);
    setPaymentStatus('error');
    setPaymentMessage((error.message as string) || tBuyCreditsPage('errors.paymentFailed'));
  };

  const handlePaymentCancel = () => {
    console.log('Payment cancelled');
    setPaymentStatus('idle');
    setPaymentMessage('');
    setOrderToken(null);
    setOrderAmount(null);
  };

  const resetPayment = () => {
    setPaymentStatus('idle');
    setPaymentMessage('');
    setOrderToken(null);
    setOrderAmount(null);
  };
  return (
    <>
      <div className="min-h-screen bg-base-100 text-base-content">
        <div className="container mx-auto px-4 py-12">
          {!isMounted ? (
            // Loading state to prevent hydration mismatch
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
              <SignedOut>
                <div className="text-center space-y-6">
                  <h1 className="text-4xl font-bold">{tBuyCreditsPage('header.title')}</h1>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    {tMyStoriesPage('signedOut.needSignIn')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href={`/${locale}/sign-in`} className="btn btn-primary">
                      {tMyStoriesPage('signedOut.signIn')}
                    </Link>
                    <Link href={`/${locale}/sign-up`} className="btn btn-outline">
                      {tMyStoriesPage('signedOut.createAccount')}
                    </Link>
                  </div>
                </div>
              </SignedOut>
              <SignedIn>
                {/* Header Section */}
                <ScrollFadeIn>
                  <header className="text-center mb-16">
                    <h1 className="text-5xl font-bold text-primary">
                      {tBuyCreditsPage('header.title')}
                    </h1>
                    <p className="text-xl mt-4 text-gray-700">
                      {tBuyCreditsPage('header.subtitle')}
                    </p>
                  </header>
                </ScrollFadeIn>

                {/* Promo / Referral Code Section */}
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
                    {/* Left Side - Available Packages */}
                    <div>
                      <h2 className="text-2xl font-bold mb-6">
                        {tBuyCreditsPage('packages.title')}
                      </h2>
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
                              className={`card bg-base-200 shadow-lg border-2 ${pkg.bestValue ? 'border-accent' : pkg.popular ? 'border-secondary' : 'border-transparent'}`}
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

                    {/* Right Side - Shopping Cart */}
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

                      {/* Promotion Code Redeemer moved to top section */}

                      {/* Billing Information */}
                      {cart.length > 0 && <BillingInformation />}

                      {/* Payment Status Messages */}
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
                              {(window as Window & { mbwayErrorContactUrl?: string })
                                .mbwayErrorContactUrl && (
                                <a
                                  href={
                                    (
                                      window as Window & {
                                        mbwayErrorContactUrl?: string;
                                      }
                                    ).mbwayErrorContactUrl
                                  }
                                  className="btn btn-sm btn-secondary"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {tBuyCreditsPage('actions.contactSupport')}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Payment Section */}
                      {cart.length > 0 && paymentStatus !== 'success' && (
                        <div className="bg-base-200 rounded-lg p-6 mb-6">
                          <h3 className="text-lg font-bold mb-4">
                            {tBuyCreditsPage('payment.title')}
                          </h3>

                          {!orderToken ? (
                            <PaymentSelector
                              selected={selectedPayment}
                              onSelect={(value) => setSelectedPayment(value)}
                              t={tBuyCreditsPage}
                            />
                          ) : (
                            // Revolut Payment Widget
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">
                                  {tBuyCreditsPage('payment.completePayment')}
                                </h4>
                                <button
                                  onClick={resetPayment}
                                  className="btn btn-sm btn-outline"
                                  disabled={paymentStatus === 'processing'}
                                >
                                  {tBuyCreditsPage('actions.cancel')}
                                </button>
                              </div>

                              <RevolutPayment
                                orderToken={orderToken}
                                orderAmount={orderAmount || undefined}
                                orderCredits={orderCredits || undefined}
                                onPaymentSuccess={handlePaymentSuccess}
                                onPaymentError={handlePaymentError}
                                onPaymentCancel={handlePaymentCancel}
                                disabled={paymentStatus === 'processing'}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Place Order Button */}
                      {cart.length > 0 && !orderToken && paymentStatus !== 'success' && (
                        <button
                          disabled={!selectedPayment || isCreatingOrder}
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

                      {/* Back to Pricing */}
                      <div className="mt-6 text-center">
                        <Link href="/pricing" className="btn btn-outline">
                          {tBuyCreditsPage('actions.backToPricing')}
                        </Link>
                      </div>
                    </div>
                  </div>
                </ScrollFadeIn>
              </SignedIn>
            </>
          )}
        </div>
      </div>
      <MbwayPaymentModal
        open={showMbwayModal}
        onClose={() => {
          setShowMbwayModal(false);
          // After closing, clear cart to avoid duplicate attempts
          if (cart.length > 0) clearCart();
        }}
        amount={mbwayAmount}
        paymentCode={mbwayPaymentCode}
      />
    </>
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
  // Use the correct translation namespace for the buy credits page
  const tBuyCreditsPage = useTranslations('BuyCreditsPage');
  return <div>{tBuyCreditsPage('buyCredits')}</div>;
}
