'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { FaShoppingCart, FaBookOpen, FaVolumeUp, FaPrint, FaGift, FaQuestionCircle, FaPalette, FaInfoCircle } from 'react-icons/fa';
import { useTranslations } from 'next-intl';

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

interface Service {
	id: string;
	name: string;
	cost: number;
	icon: string;
	serviceCode: string;
	isActive: boolean;
}

export default function PricingPage() {
	const t = useTranslations('PricingPage');
	const [services, setServices] = useState<Service[]>([]);
	const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
	const [loading, setLoading] = useState(true);
	const [packagesLoading, setPackagesLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [packagesError, setPackagesError] = useState<string | null>(null);
	const [selectedInfo, setSelectedInfo] = useState<string | null>(null);
	const infoTexts = {
		textReview: t('infoTexts.textReview'),
		imageGeneration: t('infoTexts.imageGeneration'),
		printedBooks: t('infoTexts.printedBooks')
	};

	const handleInfoClick = (infoType: string) => {
		setSelectedInfo(infoType);
	};

	const closeModal = () => {
		setSelectedInfo(null);
	};
	const fetchServices = useCallback(async () => {
		try {
			const response = await fetch('/api/pricing/services');
			if (!response.ok) {
				throw new Error('Failed to fetch services');
			}
			const data = await response.json();
			setServices(data.services);
		} catch (error) {
			console.error('Error fetching services:', error);
			setError(t('errors.loadingFailed'));
		} finally {
			setLoading(false);
		}
	}, [t]);

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
			setPackagesError(t('errors.loadingFailed'));
		} finally {
			setPackagesLoading(false);
		}
	}, [t]);

	useEffect(() => {
		fetchServices();
		fetchCreditPackages();
	}, [fetchServices, fetchCreditPackages]);
	const getServiceCost = (serviceCode: string): number => {
		const service = services.find(s => s.serviceCode === serviceCode);
		return service ? service.cost : 0;
	};

	const getIconComponent = (iconName: string) => {
		// For now, all packages use FaShoppingCart, but this can be extended
		switch (iconName) {
			case 'FaShoppingCart':
			default:
				return <FaShoppingCart />;
		}
	};
	return (
		<div className="min-h-screen bg-base-100 text-base-content">
			<div className="container mx-auto px-4 py-12">
				{/* Header Section */}
				<header className="text-center mb-16">
					<h1 className="text-5xl font-bold text-primary">{t('header.title')}</h1>
					<p className="text-xl mt-4 text-gray-700">{t('header.subtitle')}</p>
				</header>

				{/* Service Costs Section */}
				<section id="service-costs" className="my-16">
					{loading ? (
						<div className="text-center py-12">
							<span className="loading loading-spinner loading-lg"></span>
							<p className="text-lg text-gray-600 mt-4">{t('serviceCosts.loading')}</p>
						</div>
					) : error ? (
						<div className="alert alert-error">
							<span>{error}</span>
						</div>
					) : (<div className="bg-base-200 p-6 rounded-lg shadow-xl max-w-4xl mx-auto">
						<div className="text-lg leading-relaxed">
						<div className="flex justify-between items-center mb-4">
							<p className="font-semibold">{t('serviceCosts.availableServices')}</p>
							<p className="font-semibold text-right">{t('serviceCosts.creditsHeader')}</p>
						</div>
						<ul className="space-y-3">
							<li className="flex items-center justify-between">
								<span className="flex items-center">
									<FaBookOpen className="mr-2 text-primary" />
									{t('serviceCosts.services.generateEbook')}
								</span>
								<span className="font-semibold">{getServiceCost('eBookGeneration')}</span>
							</li>

							<li className="flex items-center justify-between">
								<span className="flex items-center">
									<FaVolumeUp className="mr-2 text-primary" />
									{t('serviceCosts.services.narrateAudiobook')}
								</span>
								<span className="font-semibold">{getServiceCost('audioBookGeneration')}</span>
							</li>

							<li>
								<div className="flex items-center justify-between">
									<span className="flex items-center">
										<FaPalette className="mr-2 text-primary" />
										{t('serviceCosts.services.editBook')}
									</span>
								</div>
								<ul className="ml-8 mt-2 space-y-2">
									<li className="flex items-center justify-between">
										<span>* {t('serviceCosts.services.manualEditing')}</span>
										<span className="font-semibold">{getServiceCost('manualEditing')}</span>
									</li>
									<li className="flex items-center justify-between">
										<span className="flex items-center">
											* {t('serviceCosts.services.textReviewAI')}
											<button
												onClick={() => handleInfoClick('textReview')}
												className="ml-2 text-info hover:text-info-focus"
											>
												<FaInfoCircle className="text-sm" />
											</button>
										</span>
										<span className="font-semibold">{getServiceCost('AiTextEditing')}</span>
									</li>
									<li className="flex items-center justify-between">
										<span className="flex items-center">
											* {t('serviceCosts.services.generateNewImages')}
											<button
												onClick={() => handleInfoClick('imageGeneration')}
												className="ml-2 text-info hover:text-info-focus"
											>
												<FaInfoCircle className="text-sm" />
											</button>
										</span>
										<span className="font-semibold">{getServiceCost('AiImageEditing')}</span>
									</li>
								</ul>
							</li>

							<li>
								<div className="flex items-center justify-between">
									<span className="flex items-center">
										<FaPrint className="mr-2 text-primary" />
										{t('serviceCosts.services.printShipBook')}
									</span>
								</div>
								<ul className="ml-8 mt-2 space-y-2">
									<li className="flex items-center justify-between">
										<span className="flex items-center">
											* {t('serviceCosts.services.softCover')}
											<button
												onClick={() => handleInfoClick('printedBooks')}
												className="ml-2 text-info hover:text-info-focus"
											>
												<FaInfoCircle className="text-sm" />
											</button>
										</span>
										<span className="font-semibold">{getServiceCost('printedSoftCover')}</span>
									</li>
									<li className="flex items-center justify-between">
										<span className="flex items-center">
											* {t('serviceCosts.services.hardCover')}
											<button
												onClick={() => handleInfoClick('printedBooks')}
												className="ml-2 text-info hover:text-info-focus"
											>
												<FaInfoCircle className="text-sm" />
											</button>
										</span>
										<span className="font-semibold">{getServiceCost('printedHardcover')}</span>
									</li>
									<li className="flex items-center justify-between">
										<span>* {t('serviceCosts.services.extraChapterCost')}</span>
										<span className="font-semibold">{getServiceCost('extraChapterCost')}</span>
									</li>
								</ul>
							</li>
						</ul>
					</div>
					</div>
					)}
				</section>

				<div className="divider my-16"></div>

				{/* Credit Packages Section */}
				<section id="buy-credits" className="my-16">
					{packagesLoading ? (
						<div className="text-center py-12">
							<span className="loading loading-spinner loading-lg"></span>
							<p className="text-lg text-gray-600 mt-4">{t('serviceCosts.loading')}</p>
						</div>
					) : packagesError ? (
						<div className="alert alert-error">
							<span>{packagesError}</span>
						</div>
					) : (
						<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
							{creditPackages.map((pkg: CreditPackage) => (
								<div key={pkg.id} className={`card bg-base-200 shadow-xl relative ${pkg.bestValue ? 'border-2 border-accent' : pkg.popular ? 'border-2 border-secondary' : ''}`}>
									{pkg.bestValue && <div className="badge badge-accent absolute -top-3 -right-3 p-2">{t('creditPackages.badges.bestValue')}</div>}
									{pkg.popular && <div className="badge badge-secondary absolute -top-3 -right-3 p-2">{t('creditPackages.badges.popular')}</div>}
									<div className="card-body items-center text-center">
										<div className="text-4xl text-primary mb-2">{getIconComponent(pkg.icon)}</div>
										<h3 className="card-title text-3xl">{pkg.credits} {t('creditPackages.credits')}</h3>
										<p className="text-2xl font-semibold my-2">€{pkg.price}</p>
										<p className="text-sm text-gray-400 mb-4">
											{t(`creditPackages.packages.${pkg.key}.description`)}
										</p>
										<div className="card-actions">
											<Link href={`/buy-credits?package=${pkg.id}`} className="btn btn-primary w-full">
												{t('creditPackages.buyButton', { credits: pkg.credits })}
											</Link>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</section>

				{/* New User Credits Message */}
				<div className="text-center mt-8 mb-4">
					<p className="text-lg text-primary font-semibold">
						<FaGift className="inline mr-2" />
						{t('newUserMessage')}
					</p>
				</div>

				<div className="divider my-16"></div>

				{/* Why Credits Section */}
				<section id="why-credits" className="my-16 hero bg-base-200 rounded-box p-4 sm:p-6 lg:p-10">
					<div className="hero-content flex-col lg:flex-row max-w-none w-full px-0 sm:px-2">
						<FaGift className="text-7xl text-accent mb-6 lg:mb-0 lg:mr-10" />
						<div>
							<h2 className="text-3xl font-bold mb-4">{t('whyCredits.title')}</h2>
							<ul className="list-disc list-inside space-y-2 text-gray-700">
								<li><strong>{t('whyCredits.benefits.flexibility.title')}</strong> {t('whyCredits.benefits.flexibility.description')}</li>
								<li><strong>{t('whyCredits.benefits.savings.title')}</strong> {t('whyCredits.benefits.savings.description')}</li>
								<li><strong>{t('whyCredits.benefits.gifting.title')}</strong> {t('whyCredits.benefits.gifting.description')}</li>
								<li><strong>{t('whyCredits.benefits.simplicity.title')}</strong> {t('whyCredits.benefits.simplicity.description')}</li>
							</ul>
						</div>
					</div>
				</section>

				<div className="divider my-16"></div>

				{/* FAQ Section */}
				<section id="faq" className="my-16 px-2 sm:px-4">
					<h2 className="text-4xl font-bold text-center mb-10">{t('faq.title')}</h2>
					<div className="space-y-4 max-w-4xl mx-auto px-0 sm:px-4">
						<div tabIndex={0} className="collapse collapse-plus border border-base-300 bg-base-200 rounded-box">
							<div className="collapse-title text-xl font-medium flex items-center">
								<FaQuestionCircle className="mr-2 text-primary" /> {t('faq.questions.expiration.question')}
							</div>
							<div className="collapse-content">
								<p>{t('faq.questions.expiration.answer')}</p>
							</div>
						</div>
						<div tabIndex={1} className="collapse collapse-plus border border-base-300 bg-base-200 rounded-box">
							<div className="collapse-title text-xl font-medium flex items-center">
								<FaQuestionCircle className="mr-2 text-primary" /> {t('faq.questions.refund.question')}
							</div>
							<div className="collapse-content">
								<p>{t('faq.questions.refund.answer')}</p>
							</div>
						</div>
						<div tabIndex={2} className="collapse collapse-plus border border-base-300 bg-base-200 rounded-box">
							<div className="collapse-title text-xl font-medium flex items-center">
								<FaQuestionCircle className="mr-2 text-primary" /> {t('faq.questions.payment.question')}
							</div>
							<div className="collapse-content">
								<p>{t('faq.questions.payment.answer')}</p>
							</div>
						</div>
						<div tabIndex={3} className="collapse collapse-plus border border-base-300 bg-base-200 rounded-box">
							<div className="collapse-title text-xl font-medium flex items-center">
								<FaQuestionCircle className="mr-2 text-primary" /> {t('faq.questions.shipping.question')}
							</div>
							<div className="collapse-content">
								<p>{t('faq.questions.shipping.answer')}</p>
							</div>
						</div>
					</div>
				</section>

			</div>

			{/* Info Modal */}
			{selectedInfo && (
				<div className="modal modal-open">
					<div className="modal-box w-10/12 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-4">
                                                <h3 className="font-bold text-lg mb-4">{t('infoModal.title')}</h3>
						<p className="py-2">{infoTexts[selectedInfo as keyof typeof infoTexts]}</p>
						<div className="modal-action">
                                                        <button className="btn" onClick={closeModal}>{t('infoModal.close')}</button>
						</div>
					</div>
					<div className="modal-backdrop" onClick={closeModal}></div>
				</div>
			)}
		</div>
	);
}
