'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { SignedIn, SignedOut } from '@clerk/nextjs';

import { FaShoppingCart, FaPlus, FaMinus, FaTrash, FaCreditCard, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import BillingInformation from '@/components/BillingInformation';
import RevolutPayment from '@/components/RevolutPayment';

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

	   // Handle client-side mounting to prevent hydration issues
	   useEffect(() => {
			   setIsMounted(true);
	   }, []);

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
			   const packageId = searchParams.get('package');
			   if (packageId) {
					   const id = parseInt(packageId);
					   if (creditPackages.find(pkg => pkg.id === id)) {
							   setCart([{ packageId: id, quantity: 1 }]);
					   }
			   }
	   }, [searchParams, creditPackages]);

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
				throw new Error(data.error || 'Failed to create order');
			}

			console.log('Order created successfully:', data);

			if (selectedPayment === 'mbway') {
				// For MB Way, show success message and redirect
				setPaymentStatus('success');
				setPaymentMessage(t('payment.mbwaySuccess'));
				
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
							{/* Header */}
							<header className="text-center mb-12">
								<h1 className="text-4xl font-bold text-primary mb-4">{t('header.title')}</h1>
								<p className="text-lg text-gray-600">{t('header.subtitle')}</p>
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
						<div className="bg-base-200 rounded-lg p-6 mb-6">
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
							<div className={`alert mb-6 ${
								paymentStatus === 'success' ? 'alert-success' : 
								paymentStatus === 'error' ? 'alert-error' : 
								'alert-info'
							}`}>
								<div className="flex items-center space-x-2">
									{paymentStatus === 'success' && <FaCheckCircle />}
									{paymentStatus === 'error' && <FaExclamationTriangle />}
									{paymentStatus === 'processing' && <span className="loading loading-spinner loading-sm"></span>}
									<span>{paymentMessage}</span>
								</div>
								{paymentStatus === 'error' && (
									<div className="flex space-x-2">
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
									alt="MB Way" 
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
