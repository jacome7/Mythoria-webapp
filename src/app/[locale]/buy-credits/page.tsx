'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { SignedIn, SignedOut } from '@clerk/nextjs';

import { FaShoppingCart, FaPlus, FaMinus, FaTrash, FaCreditCard, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import BillingInformation from '@/components/BillingInformation';
import RevolutPayment from '@/components/RevolutPayment';
import { trackCommerce } from '@/lib/analytics';

interface CreditPackage {
	   id: number;
	   credits: number;
	   price: number;
	   popular: boolean;
	   bestValue: boolean;
	   icon: string;
	   key: string;
	   dbId: string;
}

interface CartItem {
	packageId: number;
	quantity: number;
}

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
	   const t = useTranslations('BuyCreditsPage');
	   const tPricing = useTranslations('PricingPage');
	   const tMyStories = useTranslations('MyStoriesPage');
	   const tRevolut = useTranslations('RevolutPayment');
	   const locale = useLocale();
	   const [cart, setCart] = useState<CartItem[]>([]);
	   const [selectedPayment, setSelectedPayment] = useState<string>('revolut');
	   const [isMounted, setIsMounted] = useState(false);
	   const [orderToken, setOrderToken] = useState<string | null>(null);
	   const [orderAmount, setOrderAmount] = useState<number | null>(null);
	   const [isCreatingOrder, setIsCreatingOrder] = useState(false);
	   const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
	   const [paymentMessage, setPaymentMessage] = useState<string>('');
	   const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
	   const [packagesLoading, setPackagesLoading] = useState(true);
	   const [packagesError, setPackagesError] = useState<string | null>(null);
	   
	   // Ref for cart items section
	   const cartItemsRef = useRef<HTMLDivElement>(null);

	   // Handle client-side mounting to prevent hydration issues
	   useEffect(() => {
			   setIsMounted(true);
	   }, []);

	   // Check for Revolut error parameters in URL
	   useEffect(() => {
			   if (!isMounted) return;

			   const revolutOrderId = searchParams?.get('_rp_oid') ?? null;
			   const revolutFailureReason = searchParams?.get('_rp_fr') ?? null;
			   const paymentStatus = searchParams?.get('payment') ?? null;
			   
			   if (revolutOrderId && revolutFailureReason) {
					   console.log('Revolut error parameters:', { revolutOrderId, revolutFailureReason });
					   
					   // Create a mapping of common error messages to error codes
					   const errorMessageToCode: { [key: string]: string } = {
							   'Expired card. Please double check the expiration date or try another card': 'expired_card',
							   'Insufficient funds': 'insufficient_funds',
							   'Invalid card number': 'invalid_card',
							   'Invalid CVV': 'invalid_cvv',
							   'Invalid expiry date': 'invalid_expiry',
							   'Card reported lost or stolen': 'pick_up_card',
							   'Payment declined due to suspected fraud': 'suspected_fraud',
							   'Technical error occurred': 'technical_error',
							   'Card issuer declined the payment': 'issuer_decline',
							   'Payment was cancelled by the cardholder': 'rejected_by_customer',
							   'This transaction is not allowed': 'transaction_not_allowed',
							   'Authentication required': 'authentication_required',
							   'Invalid billing address': 'invalid_address',
							   'Invalid phone number': 'invalid_phone',
							   'Invalid email address': 'invalid_email'
					   };
					   
					   // Try to map the error message to a known error code first
					   let errorCode = errorMessageToCode[revolutFailureReason];
					   
					   // If no direct match, try to find if it's already an error code
					   if (!errorCode) {
							   // Check if it matches any of our error code keys directly
							   const errorKeys = [
									   '3ds_challenge_failed_manually', 'insufficient_funds', 'transaction_not_allowed_for_cardholder',
									   'high_risk', 'cardholder_name_missing', 'unknown_card', 'customer_challenge_abandoned',
									   'customer_challenge_failed', 'customer_name_mismatch', 'do_not_honour', 'expired_card',
									   'invalid_address', 'invalid_amount', 'invalid_card', 'invalid_email', 'invalid_country',
									   'invalid_cvv', 'invalid_expiry', 'invalid_merchant', 'invalid_phone', 'invalid_pin',
									   'issuer_not_available', 'pick_up_card', 'rejected_by_customer', 'restricted_card',
									   'technical_error', 'withdrawal_limit_exceeded', 'issuer_decline', 'suspected_fraud',
									   'lost_card', 'stolen_card', 'security_violation', 'law_violation', 'transaction_not_allowed',
									   'authentication_required', 'invalid_account', 'invalid_transaction', 'no_such_issuer',
									   'currency_not_supported', 'new_card_not_unblocked', 'withdrawal_frequency_exceeded',
									   'pin_try_exceeded', 'pin_required', 'customer_verification_failed',
									   'card_not_enrolled_to_three_ds', 'no_common_supported_three_ds_version',
									   'payment_attempt_blocked', 'unknown'
							   ];
							   
							   if (errorKeys.includes(revolutFailureReason)) {
									   errorCode = revolutFailureReason;
							   } else {
									   errorCode = 'unknown';
							   }
					   }
					   
					   console.log('Mapped error code:', errorCode);
					   
					   // Get the localized error message
					   let errorMessage: string;
					   
					   try {
							   // Use a safe translation lookup with fallback
							   if (errorCode && errorCode !== 'unknown') {
									   try {
											   const translatedMessage = tRevolut(`errors.${errorCode}`);
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
											   const unknownMessage = tRevolut('errors.unknown');
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
					   // Handle successful payment redirect
					   setPaymentStatus('success');
					   setPaymentMessage(t('payment.success'));
					   
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
					   setCart([]);
					   setOrderToken(null);
					   
					   // Clean up URL and redirect after short delay
					   const newUrl = new URL(window.location.href);
					   newUrl.searchParams.delete('payment');
					   window.history.replaceState({}, '', newUrl.toString());
					   
					   setTimeout(() => {
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
	   }, [isMounted, searchParams, tRevolut, t, locale]);

	   // Fetch credit packages from API (like pricing page)
	   const fetchCreditPackages = useCallback(async () => {
			   try {
					   const response = await fetch('/api/pricing/credit-packages');
					   if (!response.ok) {
							   throw new Error('Failed to fetch credit packages');
					   }
					   const data = await response.json();
					   // Sort packages by price ascending
					   const sortedPackages = data.packages.sort((a: CreditPackage, b: CreditPackage) => a.price - b.price);
					   setCreditPackages(sortedPackages);
			   } catch (error) {
					   console.error('Error fetching credit packages:', error);
					   setPackagesError(tPricing('errors.loadingFailed'));
			   } finally {
					   setPackagesLoading(false);
			   }
	   }, [tPricing]);

	   useEffect(() => {
			   fetchCreditPackages();
	   }, [fetchCreditPackages]);

	   // Pre-select package if coming from pricing page
	   useEffect(() => {
			   const packageId = searchParams?.get('package') ?? null;
			   if (packageId) {
					   const id = parseInt(packageId);
					   if (creditPackages.find(pkg => pkg.id === id)) {
							   setCart([{ packageId: id, quantity: 1 }]);
					   }
			   }
	   }, [searchParams, creditPackages]);

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
							   behavior: 'smooth'
					   });
			   }
	   };

	   const addToCart = (packageId: number) => {
			   setCart(prev => {
					   const existing = prev.find(item => item.packageId === packageId);
					   if (existing) {
							   return prev.map(item =>
									   item.packageId === packageId
											   ? { ...item, quantity: item.quantity + 1 }
											   : item
							   );
					   } else {
							   return [...prev, { packageId, quantity: 1 }];
					   }
			   });
			   
			   // Scroll to cart items on mobile after a short delay to allow state update
			   setTimeout(() => {
					   scrollToCartItems();
			   }, 100);
	   };

	   const updateQuantity = (packageId: number, quantity: number) => {
			   if (quantity <= 0) {
					   removeFromCart(packageId);
					   return;
			   }
			   setCart(prev =>
					   prev.map(item =>
							   item.packageId === packageId
									   ? { ...item, quantity }
									   : item
					   )
			   );
	   };

	   const removeFromCart = (packageId: number) => {
			   setCart(prev => prev.filter(item => item.packageId !== packageId));
	   };

	   const getPackageById = (id: number) => {
			   return creditPackages.find(pkg => pkg.id === id);
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
			alert(t('errors.emptyCart'));
			return;
		}

		setIsCreatingOrder(true);
		setPaymentMessage(t('payment.creatingOrder'));

		try {
			// Prepare credit packages for API
			const creditPackages = cart.map(item => ({
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
                                throw new Error(data.error || t('errors.orderCreationFailed'));
			}

			console.log('Order created successfully:', data);

			if (selectedPayment === 'mbway') {
				// For MB Way, show success message and redirect
				setPaymentStatus('success');
				setPaymentMessage(t('payment.mbwaySuccess'));
				
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
				
				// Clear cart and reset form
				setCart([]);
				
				// Redirect to my stories page after a short delay
				setTimeout(() => {
					window.location.href = `/${locale}/my-stories`;
				}, 3000);
			} else {
				// Store order details for other payment methods
				setOrderToken(data.orderToken);
				setOrderAmount(data.amount);
				setPaymentMessage(t('payment.orderCreated'));
			}

		} catch (error) {
			console.error('Order creation failed:', error);
			setPaymentStatus('error');
			
			let errorMessage = error instanceof Error ? error.message : t('errors.orderCreationFailed');
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
				contactUrl 
					? `${errorMessage} ${t('errors.contactSupport')} `
					: errorMessage
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
		console.log('Payment successful:', result);
		
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
		
		setPaymentStatus('success');
		setPaymentMessage(t('payment.success'));
		
		// Clear cart and reset form
		setCart([]);
		setOrderToken(null);
		
		// Redirect to my stories page after a short delay
		setTimeout(() => {
			window.location.href = `/${locale}/my-stories`;
		}, 3000);
	};

	const handlePaymentError = (error: Record<string, unknown>) => {
		console.error('Payment failed:', error);
		setPaymentStatus('error');
		setPaymentMessage((error.message as string) || t('errors.paymentFailed'));
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
	};	return (
		<div className="min-h-screen bg-base-100 text-base-content">
			<div className="container mx-auto px-4 py-12">
				{!isMounted ? (
					// Loading state to prevent hydration mismatch
					<div className="text-center">
						<h1 className="text-4xl font-bold text-primary mb-4">{t('header.title')}</h1>
						<div className="flex justify-center items-center min-h-96">
							<span className="loading loading-spinner loading-lg"></span>
						</div>
					</div>
				) : (
					<>
						<SignedOut>
							<div className="text-center space-y-6">
								<h1 className="text-4xl font-bold">{t('header.title')}</h1>
								<p className="text-lg text-gray-600 max-w-2xl mx-auto">
									{tMyStories('signedOut.needSignIn')}
								</p>
								<div className="flex flex-col sm:flex-row gap-4 justify-center">
									<Link href={`/${locale}/sign-in`} className="btn btn-primary">
										{tMyStories('signedOut.signIn')}
									</Link>
									<Link href={`/${locale}/sign-up`} className="btn btn-outline">
										{tMyStories('signedOut.createAccount')}
									</Link>
								</div>
							</div>
						</SignedOut>
						<SignedIn>
							{/* Header Section */}
							<header className="text-center mb-16">
								<h1 className="text-5xl font-bold text-primary">{t('header.title')}</h1>
								<p className="text-xl mt-4 text-gray-700">{t('header.subtitle')}</p>
							</header>

				<div className="grid lg:grid-cols-2 gap-12">
					{/* Left Side - Available Packages */}
					<div>
						<h2 className="text-2xl font-bold mb-6">{t('packages.title')}</h2>
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
									<div key={pkg.id} className={`card bg-base-200 shadow-lg border-2 ${pkg.bestValue ? 'border-accent' : pkg.popular ? 'border-secondary' : 'border-transparent'}`}>
										{pkg.bestValue && <div className="badge badge-accent absolute -top-3 -right-3 p-2">{t('badges.bestValue')}</div>}
										{pkg.popular && <div className="badge badge-secondary absolute -top-3 -right-3 p-2">{t('badges.popular')}</div>}
										<div className="card-body">
											<div className="flex items-center justify-between">
												<div className="flex items-center space-x-4">
													<div className="text-3xl text-primary">{getIconComponent(pkg.icon)}</div>
													<div>
														<h3 className="text-xl font-bold">{pkg.credits} {tPricing('creditPackages.credits')}</h3>
														<p className="text-lg font-semibold text-primary">€{pkg.price.toFixed(2)}</p>
													</div>
												</div>
												<button
													onClick={() => addToCart(pkg.id)}
													className="btn btn-primary"
												>
													{t('packages.addToCart')}
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
						<h2 className="text-2xl font-bold mb-6">{t('cart.title')}</h2>
						
						{/* Cart Items */}
						<div ref={cartItemsRef} className="bg-base-200 rounded-lg p-6 mb-6">
							{cart.length === 0 ? (
								<p className="text-center text-gray-500 py-8">{t('cart.empty')}</p>
							) : (
								<div className="space-y-4">
									{cart.map((item) => {
										const pkg = getPackageById(item.packageId);
										if (!pkg) return null;
										
										return (
											<div key={item.packageId} className="flex items-center justify-between border-b border-base-300 pb-4">
												<div className="flex items-center space-x-3">
													<div className="text-2xl text-primary">{getIconComponent(pkg.icon)}</div>
													<div>
														<h4 className="font-semibold">{pkg.credits} {tPricing('creditPackages.credits')}</h4>
														<p className="text-sm text-gray-600">€{pkg.price.toFixed(2)} {t('cart.each')}</p>
													</div>
												</div>
												<div className="flex items-center space-x-3">
													<div className="flex items-center space-x-2">
														<button
															onClick={() => updateQuantity(item.packageId, item.quantity - 1)}
															className="btn btn-sm btn-outline"
														>
															<FaMinus />
														</button>
														<span className="w-8 text-center font-semibold">{item.quantity}</span>
														<button
															onClick={() => updateQuantity(item.packageId, item.quantity + 1)}
															className="btn btn-sm btn-outline"
														>
															<FaPlus />
														</button>
													</div>
													<button
														onClick={() => removeFromCart(item.packageId)}
														className="btn btn-sm btn-error"
													>
														<FaTrash />
													</button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>

						{/* Pricing Summary */}
						{cart.length > 0 && (
							<div className="bg-base-200 rounded-lg p-6 mb-6">
								<h3 className="text-lg font-bold mb-4">{t('summary.title')}</h3>
								<div className="space-y-2">
									<div className="flex justify-between">
										<span>{t('summary.subtotal')}</span>
										<span>€{subtotal.toFixed(2)}</span>
									</div>
									<div className="flex justify-between text-sm text-gray-600">
										<span>{t('summary.vat')}</span>
										<span>€{vatAmount.toFixed(2)}</span>
									</div>
									<div className="divider my-2"></div>
									<div className="flex justify-between text-xl font-bold">
										<span>{t('summary.total')}</span>
										<span className="text-primary">€{total.toFixed(2)}</span>
									</div>
								</div>
							</div>
						)}

						{/* Billing Information */}
						{cart.length > 0 && (
							<BillingInformation />
						)}

						{/* Payment Status Messages */}
						{paymentStatus !== 'idle' && (
							<div className={`mb-6 ${
								paymentStatus === 'success' ? 'alert alert-success' : 
								paymentStatus === 'error' ? 'bg-error/10 border border-error/20 rounded-lg p-4' : 
								'alert alert-info'
							}`}>
								<div className="flex items-center space-x-2">
									{paymentStatus === 'success' && <FaCheckCircle />}
									{paymentStatus === 'error' && <FaExclamationTriangle className="text-error" />}
									{paymentStatus === 'processing' && <span className="loading loading-spinner loading-sm"></span>}
									<span className={paymentStatus === 'error' ? 'text-error' : ''}>{paymentMessage}</span>
								</div>
								{paymentStatus === 'error' && (
									<div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-3">
										<button onClick={resetPayment} className="btn btn-sm btn-outline">
											{t('actions.tryAgain')}
										</button>
										{(window as Window & { mbwayErrorContactUrl?: string }).mbwayErrorContactUrl && (
											<a 
												href={(window as Window & { mbwayErrorContactUrl?: string }).mbwayErrorContactUrl} 
												className="btn btn-sm btn-secondary"
												target="_blank"
												rel="noopener noreferrer"
											>
												{t('actions.contactSupport')}
											</a>
										)}
									</div>
								)}
							</div>
						)}



						{/* Payment Section */}
						{cart.length > 0 && paymentStatus !== 'success' && (
							<div className="bg-base-200 rounded-lg p-6 mb-6">
								<h3 className="text-lg font-bold mb-4">{t('payment.title')}</h3>
								
								{!orderToken ? (
									// Payment method selection
									<div className="space-y-3">
										<label className="flex items-center space-x-3 cursor-pointer">
											<input
												type="radio"
												name="payment"
												value="revolut"
												checked={selectedPayment === 'revolut'}
												onChange={(e) => setSelectedPayment(e.target.value)}
												className="radio radio-primary"
											/>
											<div className="flex items-center space-x-2">
												<FaCreditCard className="text-primary" />
												<span className="font-semibold">{t('payment.revolutPay')}</span>
											</div>
										</label>
										<p className="text-sm text-gray-600 ml-8">
											{t('payment.revolutDescription')}
										</p>
						{/* MBWay Option */}
						<label className="flex items-center space-x-3 cursor-pointer">
							<input
								type="radio"
								name="payment"
								value="mbway"
								checked={selectedPayment === 'mbway'}
								onChange={(e) => setSelectedPayment(e.target.value)}
								className="radio radio-primary"
							/>
							<div className="flex items-center space-x-2">
                                                                <Image
                                                                        src="/images/mbway.png"
                                                                        alt={t('payment.mbway')}
									width={24}
									height={24}
									className="object-contain" 
								/>
								<span className="font-semibold">{t('payment.mbway')}</span>
							</div>
						</label>
						<p className="text-sm text-gray-600 ml-8">
							{t('payment.mbwayDescription')}
						</p>
									</div>
								) : (
									// Revolut Payment Widget
									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<h4 className="font-semibold">{t('payment.completePayment')}</h4>
											<button 
												onClick={resetPayment}
												className="btn btn-sm btn-outline"
												disabled={paymentStatus === 'processing'}
											>
												{t('actions.cancel')}
											</button>
										</div>
										
										<RevolutPayment
											orderToken={orderToken}
											orderAmount={orderAmount || undefined}
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
										{t('actions.creatingOrder')}
									</>
								) : (
									<>
										{t('actions.proceedToPayment')} - €{total.toFixed(2)}
									</>
								)}
							</button>
						)}
						
						{/* Back to Pricing */}
						<div className="mt-6 text-center">
							<Link href="/pricing" className="btn btn-outline">
								{t('actions.backToPricing')}
							</Link>
						</div>
					</div>
				</div>
				</SignedIn>
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
	const t = useTranslations('common.Loading');
	return <div>{t('buyCredits')}</div>;
}
