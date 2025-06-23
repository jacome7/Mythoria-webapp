'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { FaShoppingCart, FaBookOpen, FaVolumeUp, FaPrint, FaGift, FaQuestionCircle, FaRocket, FaPalette, FaFileDownload } from 'react-icons/fa';
import { useTranslations } from 'next-intl';

const creditPackages = [
	{ id: 1, credits: 5, price: 5, popular: false, bestValue: false, icon: <FaShoppingCart />, key: 'credits5' },
	{ id: 2, credits: 10, price: 9, popular: false, bestValue: false, icon: <FaShoppingCart />, key: 'credits10' },
	{ id: 3, credits: 30, price: 25, popular: false, bestValue: false, icon: <FaShoppingCart />, key: 'credits30' },
	{ id: 4, credits: 100, price: 79, popular: false, bestValue: false, icon: <FaShoppingCart />, key: 'credits100' },
];

interface Service {
	id: string;
	name: string;
	cost: number;
	icon: string;
	serviceCode: string;
	isActive: boolean;
	isMandatory: boolean;
	isDefault: boolean;
}

const iconMap = {
	FaBookOpen: <FaBookOpen className="mr-2" />,
	FaVolumeUp: <FaVolumeUp className="mr-2" />,
	FaPrint: <FaPrint className="mr-2" />,
	FaFileDownload: <FaFileDownload className="mr-2" />,
	FaPalette: <FaPalette className="mr-2" />,
	FaRocket: <FaRocket className="mr-2" />,
	FaQuestionCircle: <FaQuestionCircle className="mr-2" />,
};

export default function PricingPage() {
	const t = useTranslations('PricingPage');
	const [services, setServices] = useState<Service[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
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

	useEffect(() => {
		fetchServices();
	}, [fetchServices]);

	const getServiceName = (serviceCode: string): string => {
		const serviceMap: { [key: string]: string } = {
			'eBookGeneration': t('serviceCosts.serviceNames.ebook'),
			'audioBookGeneration': t('serviceCosts.serviceNames.audiobook'),
			'printOrder': t('serviceCosts.serviceNames.printed_book'),
		};
		return serviceMap[serviceCode] || serviceCode;
	};
	return (
		<div className="min-h-screen bg-base-100 text-base-content">
			<div className="container mx-auto px-4 py-12">
				{/* Header Section */}
				<header className="text-center mb-16">
					<h1 className="text-5xl font-bold text-primary">{t('header.title')}</h1>
					<p className="text-xl mt-4 text-gray-700">{t('header.subtitle')}</p>
				</header>

				{/* Credit Packages Section */}
				<section id="buy-credits" className="my-16">
					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
						{creditPackages.map((pkg) => (
							<div key={pkg.id} className={`card bg-base-200 shadow-xl relative ${pkg.bestValue ? 'border-2 border-accent' : pkg.popular ? 'border-2 border-secondary' : ''}`}>
								{pkg.bestValue && <div className="badge badge-accent absolute -top-3 -right-3 p-2">{t('creditPackages.badges.bestValue')}</div>}
								{pkg.popular && <div className="badge badge-secondary absolute -top-3 -right-3 p-2">{t('creditPackages.badges.popular')}</div>}
								<div className="card-body items-center text-center">
									<div className="text-4xl text-primary mb-2">{pkg.icon}</div>
									<h3 className="card-title text-3xl">{pkg.credits} {t('creditPackages.credits')}</h3>
									<p className="text-2xl font-semibold my-2">€{pkg.price}</p>
									<p className="text-sm text-gray-400 mb-4">
										{t(`creditPackages.packages.${pkg.key}.description`)}
									</p>
									<div className="card-actions">
										<button className="btn btn-primary w-full">{t('creditPackages.buyButton', { credits: pkg.credits })}</button>
									</div>
								</div>
							</div>
						))}
					</div>
				</section>

				<div className="divider my-16"></div>
				
				{/* Service Costs Section */}
				<section id="service-costs" className="my-16">
					<h2 className="text-4xl font-bold text-center mb-10">{t('serviceCosts.title')}</h2>
					{loading ? (
						<div className="text-center py-12">
							<span className="loading loading-spinner loading-lg"></span>
							<p className="text-lg text-gray-600 mt-4">{t('serviceCosts.loading')}</p>
						</div>
					) : error ? (
						<div className="alert alert-error">
							<span>{error}</span>
						</div>
					) : (
						<div className="overflow-x-auto bg-base-200 p-6 rounded-lg shadow-xl">
							<table className="table w-full">
								<thead>
									<tr>
										<th className="text-lg">{t('serviceCosts.tableHeaders.service')}</th>
										<th className="text-lg text-right">{t('serviceCosts.tableHeaders.cost')}</th>
									</tr>
								</thead>
								<tbody>
									{services.map((service) => (
										<tr key={service.id} className="hover">
											<td className="py-3 flex items-center">
												{iconMap[service.icon as keyof typeof iconMap] || iconMap.FaQuestionCircle}
												{getServiceName(service.serviceCode)}
											</td>
											<td className="py-3 text-right font-semibold">{service.cost} {t('serviceCosts.creditsUnit')}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>

				<div className="divider my-16"></div>				{/* Why Credits Section */}
				<section id="why-credits" className="my-16 hero bg-base-200 rounded-box p-10">
					<div className="hero-content flex-col lg:flex-row">
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

				<div className="divider my-16"></div>				{/* FAQ Section */}
				<section id="faq" className="my-16">
					<h2 className="text-4xl font-bold text-center mb-10">{t('faq.title')}</h2>
					<div className="space-y-4 max-w-3xl mx-auto">
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
							</div>							<div className="collapse-content">
								<p>{t('faq.questions.shipping.answer')}</p>
							</div>
						</div>
					</div>
				</section>

				<div className="divider my-16"></div>				{/* Final CTA Section */}
				<section className="my-16 text-center">
					<h2 className="text-4xl font-bold mb-6">{t('finalCta.title')}</h2>
					<p className="mb-8 text-xl max-w-2xl mx-auto text-gray-700">
						{t('finalCta.subtitle')}
					</p>
					<div className="flex flex-col sm:flex-row justify-center items-center">
						<Link href="/#buy-credits" className="btn btn-primary btn-lg mb-4 sm:mb-0 sm:mr-4 w-full sm:w-auto">
							{t('finalCta.getCreditsButton')}
						</Link>
						<Link href="/create" className="btn btn-accent btn-lg w-full sm:w-auto">
							{t('finalCta.createStoryButton')}
						</Link>
					</div>
				</section>

			</div>
		</div>
	);
}
