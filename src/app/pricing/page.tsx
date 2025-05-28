'use client';

import Link from 'next/link';
import { FaShoppingCart, FaBookOpen, FaVolumeUp, FaPrint, FaGift, FaQuestionCircle, FaRocket, FaPalette, FaFileDownload } from 'react-icons/fa';

const creditPackages = [
	{ id: 1, credits: 5, price: 5, popular: false, bestValue: false, icon: <FaShoppingCart /> },
	{ id: 2, credits: 10, price: 9, popular: true, bestValue: false, icon: <FaShoppingCart /> },
	{ id: 3, credits: 30, price: 19, popular: false, bestValue: true, icon: <FaShoppingCart /> },
	{ id: 4, credits: 100, price: 49, popular: false, bestValue: false, icon: <FaShoppingCart /> },
];

const services = [
	{ id: 1, name: 'Generate a 10-page digital book', cost: 3, icon: <FaBookOpen className="mr-2" /> },
	{ id: 2, name: 'Generate a 20-page digital book', cost: 4, icon: <FaBookOpen className="mr-2" /> },
	{ id: 3, name: 'Generate a 30-page digital book', cost: 5, icon: <FaBookOpen className="mr-2" /> },
	{ id: 4, name: 'Generate an audiobook (for any length)', cost: 2, icon: <FaVolumeUp className="mr-2" /> },
	{ id: 5, name: 'Order a printed & shipped 10-page hardcover book', cost: 20, icon: <FaPrint className="mr-2" /> },
	{ id: 6, name: 'Order a printed & shipped 20-page hardcover book', cost: 25, icon: <FaPrint className="mr-2" /> },
	{ id: 7, name: 'E-book Download (EPUB/MOBI)', cost: 1, icon: <FaFileDownload className="mr-2" /> },
	{ id: 8, name: 'Custom Illustration Pack (5 extra unique illustrations)', cost: 5, icon: <FaPalette className="mr-2" /> },
	{ id: 9, name: 'Priority Generation Queue', cost: 2, icon: <FaRocket className="mr-2" /> },
];

export default function PricingPage() {
	return (
		<div className="min-h-screen bg-base-100 text-base-content">
			<div className="container mx-auto px-4 py-12">
				{/* Header Section */}
				<header className="text-center mb-16">
					<h1 className="text-5xl font-bold text-primary">Our Pricing</h1>
					<p className="text-xl mt-4 text-gray-300">Simple, flexible, and designed for your storytelling needs.</p>
				</header>

				{/* Credit Packages Section */}
				<section id="buy-credits" className="my-16">
					<h2 className="text-4xl font-bold text-center mb-10">Purchase Story Credits</h2>
					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
						{creditPackages.map((pkg) => (
							<div key={pkg.id} className={`card bg-base-200 shadow-xl relative ${pkg.bestValue ? 'border-2 border-accent' : pkg.popular ? 'border-2 border-secondary' : ''}`}>
								{pkg.bestValue && <div className="badge badge-accent absolute -top-3 -right-3 p-2">Best Value</div>}
								{pkg.popular && <div className="badge badge-secondary absolute -top-3 -right-3 p-2">Popular</div>}
								<div className="card-body items-center text-center">
									<div className="text-4xl text-primary mb-2">{pkg.icon}</div>
									<h3 className="card-title text-3xl">{pkg.credits} Credits</h3>
									<p className="text-2xl font-semibold my-2">€{pkg.price}</p>
									<p className="text-sm text-gray-400 mb-4">
										{pkg.id === 1 && 'Perfect for trying things out.'}
										{pkg.id === 2 && 'Great for a couple of stories.'}
										{pkg.id === 3 && 'Ideal for avid storytellers.'}
										{pkg.id === 4 && 'For the ultimate story creators!'}
									</p>
									<div className="card-actions">
										<button className="btn btn-primary w-full">Buy {pkg.credits} Credits</button>
									</div>
								</div>
							</div>
						))}
					</div>
				</section>

				<div className="divider my-16"></div>

				{/* Service Costs Section */}
				<section id="service-costs" className="my-16">
					<h2 className="text-4xl font-bold text-center mb-10">What Your Credits Can Unlock</h2>
					<div className="overflow-x-auto bg-base-200 p-6 rounded-lg shadow-xl">
						<table className="table w-full">
							<thead>
								<tr>
									<th className="text-lg">Service</th>
									<th className="text-lg text-right">Cost in Credits</th>
								</tr>
							</thead>
							<tbody>
								{services.map((service) => (
									<tr key={service.id} className="hover">
										<td className="py-3 flex items-center">{service.icon} {service.name}</td>
										<td className="py-3 text-right font-semibold">{service.cost} Credits</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>

				<div className="divider my-16"></div>

				{/* Why Credits Section */}
				<section id="why-credits" className="my-16 hero bg-base-200 rounded-box p-10">
					<div className="hero-content flex-col lg:flex-row">
						<FaGift className="text-7xl text-accent mb-6 lg:mb-0 lg:mr-10" />
						<div>
							<h2 className="text-3xl font-bold mb-4">Why a Credit-Based System?</h2>
							<ul className="list-disc list-inside space-y-2 text-gray-300">
								<li><strong>Flexibility:</strong> Purchase credits in bundles and use them for any service, anytime.</li>
								<li><strong>Savings:</strong> Enjoy better value with larger credit packages. The more you buy, the more you save!</li>
								<li><strong>Gifting Made Easy:</strong> Credits can be a perfect gift for friends and family, allowing them to choose their own storytelling adventure. (Gifting feature coming soon!)</li>
								<li><strong>Simplicity:</strong> Understand the costs upfront for all our creative services. No hidden fees.</li>
							</ul>
						</div>
					</div>
				</section>

				<div className="divider my-16"></div>

				{/* FAQ Section */}
				<section id="faq" className="my-16">
					<h2 className="text-4xl font-bold text-center mb-10">Frequently Asked Questions</h2>
					<div className="space-y-4 max-w-3xl mx-auto">
						<div tabIndex={0} className="collapse collapse-plus border border-base-300 bg-base-200 rounded-box">
							<div className="collapse-title text-xl font-medium flex items-center">
								<FaQuestionCircle className="mr-2 text-primary" /> Do credits expire?
							</div>
							<div className="collapse-content">
								<p>No, your Mythoria credits never expire! You can use them whenever inspiration strikes.</p>
							</div>
						</div>
						<div tabIndex={1} className="collapse collapse-plus border border-base-300 bg-base-200 rounded-box">
							<div className="collapse-title text-xl font-medium flex items-center">
								<FaQuestionCircle className="mr-2 text-primary" /> Can I get a refund on unused credits?
							</div>
							<div className="collapse-content">
								<p>Currently, credits are non-refundable. However, they can be used for any of our services or gifted to another user in the future.</p>
							</div>
						</div>
						<div tabIndex={2} className="collapse collapse-plus border border-base-300 bg-base-200 rounded-box">
							<div className="collapse-title text-xl font-medium flex items-center">
								<FaQuestionCircle className="mr-2 text-primary" /> What payment methods do you accept?
							</div>
							<div className="collapse-content">
								<p>We plan to accept all major credit cards (Visa, MasterCard, American Express) and PayPal. (Payment integration coming soon)</p>
							</div>
						</div>
						<div tabIndex={3} className="collapse collapse-plus border border-base-300 bg-base-200 rounded-box">
							<div className="collapse-title text-xl font-medium flex items-center">
								<FaQuestionCircle className="mr-2 text-primary" /> How are printed books shipped?
							</div>							<div className="collapse-content">
								<p>Printed books are shipped via standard postal services. Shipping times and costs may vary depending on your location. You&apos;ll see detailed shipping information at checkout when ordering a printed book.</p>
							</div>
						</div>
					</div>
				</section>

				<div className="divider my-16"></div>

				{/* Final CTA Section */}
				<section className="my-16 text-center">
					<h2 className="text-4xl font-bold mb-6">Ready to Start Your Storytelling Adventure?</h2>
					<p className="mb-8 text-xl max-w-2xl mx-auto text-gray-300">
						Grab some credits and begin crafting unique, personalized stories today. Give a gift that will be cherished for a lifetime!
					</p>
					<Link href="/#buy-credits" className="btn btn-primary btn-lg mr-4">
						Get Credits Now
					</Link>
					<Link href="/create" className="btn btn-accent btn-lg">
						Create Your Story
					</Link>
				</section>

			</div>
		</div>
	);
}
