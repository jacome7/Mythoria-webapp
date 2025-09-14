"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { SignedIn, SignedOut } from "@clerk/nextjs";

import {
  FaShoppingCart,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import BillingInformation from "@/components/BillingInformation";
import CartView from "@/components/CartView";
import PaymentSelector from "@/components/PaymentSelector";
import RevolutPayment from "@/components/RevolutPayment";
import MbwayPaymentModal from "@/components/MbwayPaymentModal";
import { useCart } from "@/hooks/useCart";
import { trackCommerce } from "@/lib/analytics";
import { mapRevolutError } from "@/utils/payment/revolut-error-mapping";
import type { CreditPackage } from "@/types/cart";

// Helper function to convert icon string to React component
const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case "FaShoppingCart":
    default:
      return <FaShoppingCart />;
  }
};

// Separate component for search params to handle suspense
function BuyCreditsContent() {
  const searchParams = useSearchParams();
  const tBuyCreditsPage = useTranslations("BuyCreditsPage");
  const tPricingPage = useTranslations("PricingPage");
  const tMyStoriesPage = useTranslations("MyStoriesPage");
  const tRevolutPayment = useTranslations("RevolutPayment");
  const locale = useLocale();
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart } =
    useCart();
  const [selectedPayment, setSelectedPayment] = useState<string>("revolut");
  const [isMounted, setIsMounted] = useState(false);
  const [orderToken, setOrderToken] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState<number | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [paymentMessage, setPaymentMessage] = useState<string>("");
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  // MB Way modal state
  const [showMbwayModal, setShowMbwayModal] = useState(false);
  const [mbwayPaymentCode, setMbwayPaymentCode] = useState<string>("#XXXX");
  const [mbwayAmount, setMbwayAmount] = useState<number>(0);

  // Ref for cart items section
  const cartItemsRef = useRef<HTMLDivElement>(null);

  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check for Revolut error parameters in URL
  useEffect(() => {
    if (!isMounted) return;

    const revolutOrderId = searchParams?.get("_rp_oid") ?? null;
    const revolutFailureReason = searchParams?.get("_rp_fr") ?? null;
    const paymentStatus = searchParams?.get("payment") ?? null;

    if (revolutOrderId && revolutFailureReason) {
      console.log("Revolut error parameters:", {
        revolutOrderId,
        revolutFailureReason,
      });

      const errorCode = mapRevolutError(revolutFailureReason);

      console.log("Mapped error code:", errorCode);

      // Get the localized error message
      let errorMessage: string;

      try {
        // Use a safe translation lookup with fallback
        if (errorCode && errorCode !== "unknown") {
          try {
            const translatedMessage = tRevolutPayment(`errors.${errorCode}`);
            // Check if translation was successful (doesn't contain the key path)
            if (!translatedMessage.includes("RevolutPayment.errors.")) {
              errorMessage = translatedMessage;
            } else {
              throw new Error("Translation not found");
            }
          } catch {
            // Fallback to the original error message if translation fails
            errorMessage = revolutFailureReason;
          }
        } else {
          // Use unknown error translation or fallback to original message
          try {
            const unknownMessage = tRevolutPayment("errors.unknown");
            errorMessage = unknownMessage.includes("RevolutPayment.errors.")
              ? revolutFailureReason
              : unknownMessage;
          } catch {
            errorMessage = revolutFailureReason;
          }
        }
      } catch (error) {
        console.warn("Translation lookup failed for error:", errorCode, error);
        // Ultimate fallback to the original error message
        errorMessage = revolutFailureReason;
      }

      setPaymentStatus("error");
      setPaymentMessage(errorMessage);

      // Clean up the URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("_rp_oid");
      newUrl.searchParams.delete("_rp_fr");
      newUrl.searchParams.delete("payment");
      window.history.replaceState({}, "", newUrl.toString());
    } else if (paymentStatus === "success") {
      // Handle successful payment redirect
      setPaymentStatus("success");
      setPaymentMessage(tBuyCreditsPage("payment.success"));

      // Track credit purchase in analytics (if cart still has items)
      if (cart.length > 0) {
        const totalCredits = cart.reduce((total, item) => {
          const pkg = getPackageById(item.packageId);
          return total + (pkg ? pkg.credits * item.quantity : 0);
        }, 0);

        trackCommerce.creditPurchase({
          purchase_amount: total,
          credits_purchased: totalCredits,
        });
      }

      // Clear cart and redirect
      clearCart();
      setOrderToken(null);

      // Clean up URL and redirect after short delay
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("payment");
      window.history.replaceState({}, "", newUrl.toString());

      setTimeout(() => {
        window.location.href = `/${locale}/my-stories`;
      }, 3000);
    } else if (paymentStatus === "cancel") {
      // Handle payment cancellation
      setPaymentStatus("idle");
      setPaymentMessage("");
      setOrderToken(null);
      setOrderAmount(null);

      // Clean up URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("payment");
      window.history.replaceState({}, "", newUrl.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, searchParams, tRevolutPayment, tBuyCreditsPage, locale]);

  // Fetch credit packages from API (like pricing page)
  const fetchCreditPackages = useCallback(async () => {
    try {
      const response = await fetch("/api/pricing/credit-packages");
      if (!response.ok) {
        throw new Error("Failed to fetch credit packages");
      }
      const data = await response.json();
      // Sort packages by price ascending
      const sortedPackages = data.packages.sort(
        (a: CreditPackage, b: CreditPackage) => a.price - b.price,
      );
      setCreditPackages(sortedPackages);
    } catch (error) {
      console.error("Error fetching credit packages:", error);
      setPackagesError(tPricingPage("errors.loadingFailed"));
    } finally {
      setPackagesLoading(false);
    }
  }, [tPricingPage]);

  useEffect(() => {
    fetchCreditPackages();
  }, [fetchCreditPackages]);

  // Pre-select package if coming from pricing page
  useEffect(() => {
    const packageId = searchParams?.get("package") ?? null;
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
        behavior: "smooth",
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
    return cart.reduce((total, item) => {
      const pkg = getPackageById(item.packageId);
      return total + (pkg ? pkg.price * item.quantity : 0);
    }, 0);
  };

  const calculateVAT = (subtotal: number) => {
    // Since prices include VAT, calculate the VAT portion
    // VAT = (Price with VAT / 1.06) * 0.06
    const priceWithoutVAT = subtotal / 1.06;
    return subtotal - priceWithoutVAT;
  };

  const subtotal = calculateSubtotal();
  const vatAmount = calculateVAT(subtotal);
  const total = subtotal;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert(tBuyCreditsPage("errors.emptyCart"));
      return;
    }

    setIsCreatingOrder(true);
    setPaymentMessage(tBuyCreditsPage("payment.creatingOrder"));

    try {
      // Prepare credit packages for API
      const creditPackages = cart.map((item) => ({
        packageId: item.packageId,
        quantity: item.quantity,
      }));

      let response;

      if (selectedPayment === "mbway") {
        // Create MB Way payment request
        response = await fetch("/api/payments/mbway", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            creditPackages,
            locale: locale,
          }),
        });
      } else {
        // Create payment order for other methods
        response = await fetch("/api/payments/order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            creditPackages,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || tBuyCreditsPage("errors.orderCreationFailed"),
        );
      }

      console.log("Order created successfully:", data);

      if (selectedPayment === "mbway") {
        // Backend returns ticketNumber (e.g., 'A5CD'); display with leading '#'
        const rawCode: string | undefined = data.ticketNumber || data.ticketId || data.paymentCode;
        const formattedCode = rawCode ? `#${rawCode.replace(/^#/, "")}` : "#----";
        setMbwayPaymentCode(formattedCode);
        setMbwayAmount(data.amount ?? total);
        setShowMbwayModal(true);
        // We intentionally do not mark payment as success yet; it's pending manual action
        setPaymentStatus("idle");
        setPaymentMessage("");
      } else {
        // Store order details for other payment methods
        setOrderToken(data.orderToken);
        setOrderAmount(data.amount);
        setPaymentMessage(tBuyCreditsPage("payment.orderCreated"));
      }
    } catch (error) {
      console.error("Order creation failed:", error);
      setPaymentStatus("error");

      let errorMessage =
        error instanceof Error
          ? error.message
          : tBuyCreditsPage("errors.orderCreationFailed");
      let contactUrl = "";

      // Check if the error includes a contact URL (for MB Way failures)
      if (error instanceof Error && error.message.includes("contactUrl")) {
        try {
          const errorData = JSON.parse(error.message);
          contactUrl = errorData.contactUrl;
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If parsing fails, use the original error message
        }
      }

      setPaymentMessage(
        contactUrl
          ? `${errorMessage} ${tBuyCreditsPage("errors.contactSupport")} `
          : errorMessage,
      );

      // Store contact URL for the "Contact Support" button
      if (contactUrl) {
        (
          window as Window & { mbwayErrorContactUrl?: string }
        ).mbwayErrorContactUrl = contactUrl;
      }
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handlePaymentSuccess = (result: Record<string, unknown>) => {
    console.log("Payment successful:", result);

    // Calculate total credits purchased for analytics
    const totalCredits = cart.reduce((total, item) => {
      const pkg = getPackageById(item.packageId);
      return total + (pkg ? pkg.credits * item.quantity : 0);
    }, 0);

    // Track credit purchase in analytics
    trackCommerce.creditPurchase({
      purchase_amount: total,
      credits_purchased: totalCredits,
    });

    setPaymentStatus("success");
    setPaymentMessage(tBuyCreditsPage("payment.success"));

    // Clear cart and reset form
    clearCart();
    setOrderToken(null);

    // Redirect to my stories page after a short delay
    setTimeout(() => {
      window.location.href = `/${locale}/my-stories`;
    }, 3000);
  };

  const handlePaymentError = (error: Record<string, unknown>) => {
    console.error("Payment failed:", error);
    setPaymentStatus("error");
    setPaymentMessage(
      (error.message as string) || tBuyCreditsPage("errors.paymentFailed"),
    );
  };

  const handlePaymentCancel = () => {
    console.log("Payment cancelled");
    setPaymentStatus("idle");
    setPaymentMessage("");
    setOrderToken(null);
    setOrderAmount(null);
  };

  const resetPayment = () => {
    setPaymentStatus("idle");
    setPaymentMessage("");
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
                {tBuyCreditsPage("header.title")}
              </h1>
              <div className="flex justify-center items-center min-h-96">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            </div>
          ) : (
            <>
              <SignedOut>
                <div className="text-center space-y-6">
                  <h1 className="text-4xl font-bold">
                    {tBuyCreditsPage("header.title")}
                  </h1>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    {tMyStoriesPage("signedOut.needSignIn")}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href={`/${locale}/sign-in`} className="btn btn-primary">
                      {tMyStoriesPage("signedOut.signIn")}
                    </Link>
                    <Link href={`/${locale}/sign-up`} className="btn btn-outline">
                      {tMyStoriesPage("signedOut.createAccount")}
                    </Link>
                  </div>
                </div>
              </SignedOut>
              <SignedIn>
                {/* Header Section */}
                <header className="text-center mb-16">
                  <h1 className="text-5xl font-bold text-primary">
                    {tBuyCreditsPage("header.title")}
                  </h1>
                  <p className="text-xl mt-4 text-gray-700">
                    {tBuyCreditsPage("header.subtitle")}
                  </p>
                </header>

                <div className="grid lg:grid-cols-2 gap-12">
                  {/* Left Side - Available Packages */}
                  <div>
                    <h2 className="text-2xl font-bold mb-6">
                      {tBuyCreditsPage("packages.title")}
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
                            className={`card bg-base-200 shadow-lg border-2 ${pkg.bestValue ? "border-accent" : pkg.popular ? "border-secondary" : "border-transparent"}`}
                          >
                            {pkg.bestValue && (
                              <div className="badge badge-accent absolute -top-3 -right-3 p-2">
                                {tBuyCreditsPage("badges.bestValue")}
                              </div>
                            )}
                            {pkg.popular && (
                              <div className="badge badge-secondary absolute -top-3 -right-3 p-2">
                                {tBuyCreditsPage("badges.popular")}
                              </div>
                            )}
                            <div className="card-body">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="text-3xl text-primary">
                                    {getIconComponent(pkg.icon)}
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-bold">
                                      {pkg.credits}{" "}
                                      {tPricingPage("creditPackages.credits")}
                                    </h3>
                                    <p className="text-lg font-semibold text-primary">
                                      €{pkg.price.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleAddToCart(pkg.id)}
                                  className="btn btn-primary"
                                >
                                  {tBuyCreditsPage("packages.addToCart")}
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

                    {/* Billing Information */}
                    {cart.length > 0 && <BillingInformation />}

                    {/* Payment Status Messages */}
                    {paymentStatus !== "idle" && (
                      <div
                        className={`mb-6 ${
                          paymentStatus === "success"
                            ? "alert alert-success"
                            : paymentStatus === "error"
                              ? "bg-error/10 border border-error/20 rounded-lg p-4"
                              : "alert alert-info"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {paymentStatus === "success" && <FaCheckCircle />}
                          {paymentStatus === "error" && (
                            <FaExclamationTriangle className="text-error" />
                          )}
                          {paymentStatus === "processing" && (
                            <span className="loading loading-spinner loading-sm"></span>
                          )}
                          <span
                            className={
                              paymentStatus === "error" ? "text-error" : ""
                            }
                          >
                            {paymentMessage}
                          </span>
                        </div>
                        {paymentStatus === "error" && (
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-3">
                            <button
                              onClick={resetPayment}
                              className="btn btn-sm btn-outline"
                            >
                              {tBuyCreditsPage("actions.tryAgain")}
                            </button>
                            {(
                              window as Window & { mbwayErrorContactUrl?: string }
                            ).mbwayErrorContactUrl && (
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
                                {tBuyCreditsPage("actions.contactSupport")}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment Section */}
                    {cart.length > 0 && paymentStatus !== "success" && (
                      <div className="bg-base-200 rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-bold mb-4">
                          {tBuyCreditsPage("payment.title")}
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
                                {tBuyCreditsPage("payment.completePayment")}
                              </h4>
                              <button
                                onClick={resetPayment}
                                className="btn btn-sm btn-outline"
                                disabled={paymentStatus === "processing"}
                              >
                                {tBuyCreditsPage("actions.cancel")}
                              </button>
                            </div>

                            <RevolutPayment
                              orderToken={orderToken}
                              orderAmount={orderAmount || undefined}
                              onPaymentSuccess={handlePaymentSuccess}
                              onPaymentError={handlePaymentError}
                              onPaymentCancel={handlePaymentCancel}
                              disabled={paymentStatus === "processing"}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Place Order Button */}
                    {cart.length > 0 &&
                      !orderToken &&
                      paymentStatus !== "success" && (
                        <button
                          disabled={!selectedPayment || isCreatingOrder}
                          onClick={handlePlaceOrder}
                          className="btn btn-primary btn-lg w-full"
                        >
                          {isCreatingOrder ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              {tBuyCreditsPage("actions.creatingOrder")}
                            </>
                          ) : (
                            <>
                              {tBuyCreditsPage("actions.proceedToPayment")} - €
                              {total.toFixed(2)}
                            </>
                          )}
                        </button>
                      )}

                    {/* Back to Pricing */}
                    <div className="mt-6 text-center">
                      <Link href="/pricing" className="btn btn-outline">
                        {tBuyCreditsPage("actions.backToPricing")}
                      </Link>
                    </div>
                  </div>
                </div>
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
  const tBuyCreditsPage = useTranslations("BuyCreditsPage");
  return <div>{tBuyCreditsPage("buyCredits")}</div>;
}
