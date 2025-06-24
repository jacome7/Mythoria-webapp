'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FaShoppingCart, FaPlus, FaMinus, FaTrash, FaCreditCard, FaMobile, FaApple, FaGoogle } from 'react-icons/fa';
import { SiVisa, SiMastercard } from 'react-icons/si';

const creditPackages = [
	{ id: 1, credits: 5, price: 5, popular: false, bestValue: false, icon: <FaShoppingCart />, key: 'credits5' },
	{ id: 2, credits: 10, price: 9, popular: false, bestValue: false, icon: <FaShoppingCart />, key: 'credits10' },
	{ id: 3, credits: 30, price: 25, popular: false, bestValue: false, icon: <FaShoppingCart />, key: 'credits30' },
	{ id: 4, credits: 100, price: 79, popular: false, bestValue: false, icon: <FaShoppingCart />, key: 'credits100' },
];

interface CartItem {
	packageId: number;
	quantity: number;
}

// Separate component for search params to handle suspense
function BuyCreditsContent() {
	const searchParams = useSearchParams();
	const t = useTranslations('BuyCreditsPage');
	const tPricing = useTranslations('PricingPage');
	const [cart, setCart] = useState<CartItem[]>([]);
	const [selectedPayment, setSelectedPayment] = useState<string>('');

	// Pre-select package if coming from pricing page
	useEffect(() => {
		const packageId = searchParams.get('package');
		if (packageId) {
			const id = parseInt(packageId);
			if (creditPackages.find(pkg => pkg.id === id)) {
				setCart([{ packageId: id, quantity: 1 }]);
			}
		}
	}, [searchParams]);

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

	return (
		<div className="min-h-screen bg-base-100 text-base-content">
			<div className="container mx-auto px-4 py-12">
				{/* Header */}
				<header className="text-center mb-12">
					<h1 className="text-4xl font-bold text-primary mb-4">{t('header.title')}</h1>
					<p className="text-lg text-gray-600">{t('header.subtitle')}</p>
				</header>

				<div className="grid lg:grid-cols-2 gap-12">
					{/* Left Side - Available Packages */}
					<div>
						<h2 className="text-2xl font-bold mb-6">{t('packages.title')}</h2>
						<div className="space-y-4">
							{creditPackages.map((pkg) => (
								<div key={pkg.id} className={`card bg-base-200 shadow-lg border-2 ${pkg.bestValue ? 'border-accent' : pkg.popular ? 'border-secondary' : 'border-transparent'}`}>
									{pkg.bestValue && <div className="badge badge-accent absolute -top-3 -right-3 p-2">{t('badges.bestValue')}</div>}
									{pkg.popular && <div className="badge badge-secondary absolute -top-3 -right-3 p-2">{t('badges.popular')}</div>}
									<div className="card-body">
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-4">
												<div className="text-3xl text-primary">{pkg.icon}</div>
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
													<div className="text-2xl text-primary">{pkg.icon}</div>
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

						{/* Payment Options */}
						{cart.length > 0 && (
							<div className="bg-base-200 rounded-lg p-6 mb-6">
								<h3 className="text-lg font-bold mb-4">{t('payment.title')}</h3>
								
								{/* MBWay Option */}
								<div className="space-y-3">
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
											<FaMobile className="text-primary" />
											<span className="font-semibold">{t('payment.mbway')}</span>
										</div>
									</label>
									
									{/* Credit Cards - Coming Soon */}
									<div className="opacity-50">
										<div className="flex items-center space-x-3 mb-2">
											<input
												type="radio"
												disabled
												className="radio radio-primary"
											/>
											<div className="flex items-center space-x-2">
												<FaCreditCard className="text-gray-400" />
												<span className="font-semibold text-gray-400">{t('payment.creditCards')}</span>
												<span className="badge badge-outline text-xs">{t('payment.comingSoon')}</span>
											</div>
										</div>
										<div className="ml-8 flex items-center space-x-2 opacity-60">
											<SiVisa className="text-2xl" />
											<SiMastercard className="text-2xl" />
											<FaGoogle className="text-xl" />
											<FaApple className="text-xl" />
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Place Order Button */}
						{cart.length > 0 && (
							<button
								disabled={!selectedPayment}
								className="btn btn-primary btn-lg w-full"
							>
								{t('actions.placeOrder')} - €{total.toFixed(2)}
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
			</div>
		</div>
	);
}

export default function BuyCreditsPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<BuyCreditsContent />
		</Suspense>
	);
}
