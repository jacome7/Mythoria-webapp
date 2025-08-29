"use client";
import React from 'react';
import Link from 'next/link';

export default function ProfileOnboarding() {
	return (
		<div className="max-w-xl mx-auto p-6 space-y-4 text-sm">
			<h1 className="text-2xl font-bold">Profile Onboarding</h1>
			<p>This non-localized route is a fallback. Please use a localized path for the full onboarding experience.</p>
			<ul className="list-disc pl-5 space-y-1">
				<li>English (US): <Link className="text-blue-600 underline" href="/en-US/profile/onboarding">/en-US/profile/onboarding</Link></li>
				<li>Português: <Link className="text-blue-600 underline" href="/pt-PT/profile/onboarding">/pt-PT/profile/onboarding</Link></li>
				<li>Español: <Link className="text-blue-600 underline" href="/es-ES/profile/onboarding">/es-ES/profile/onboarding</Link></li>
				<li>Français: <Link className="text-blue-600 underline" href="/fr-FR/profile/onboarding">/fr-FR/profile/onboarding</Link></li>
			</ul>
		</div>
	);
}
