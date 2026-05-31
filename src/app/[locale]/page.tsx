'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Show } from '@clerk/nextjs';
import StoryCounter from '@/components/StoryCounter';
import QuoteOfTheDay from '@/components/QuoteOfTheDay';
import WhyChooseMythoria from '@/components/WhyChooseMythoria';
import ScrollFadeIn from '@/components/ScrollFadeIn';
import PaperCutHero from '@/components/papercut/PaperCutHero';

export default function Home() {
  const tHomePage = useTranslations('HomePage');
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <PaperCutHero />
      <div className="container mx-auto px-4 py-4">
        {/* Audience Sections */}
        <ScrollFadeIn threshold={0.1} rootMargin="0px 0px -20px 0px">
          <section className="my-16">
            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <ScrollFadeIn delay={100} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <Link
                  href="/pt-PT/p/mateus-e-o-leo"
                  className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
                >
                  <figure className="px-10 pt-10">
                    <Image
                      src="/SampleBooks/Mateus_e_o_leao.jpg"
                      alt={tHomePage('altTexts.kidsBook')}
                      width={300}
                      height={300}
                      className="rounded-xl"
                    />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-2xl">{tHomePage('audiences.kids.title')}</h2>
                    <p>{tHomePage('audiences.kids.description')}</p>
                  </div>
                </Link>
              </ScrollFadeIn>

              <ScrollFadeIn delay={200} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <Link
                  href="/pt-PT/p/juventude-de-gaia-no-mundial-de-clubes"
                  className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
                >
                  <figure className="px-10 pt-10">
                    <Image
                      src="/SampleBooks/juventude_gaia.jpg"
                      alt={tHomePage('altTexts.groupsYearbooks')}
                      width={300}
                      height={300}
                      className="rounded-xl"
                    />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-2xl">{tHomePage('audiences.groups.title')}</h2>
                    <p>{tHomePage('audiences.groups.description')}</p>
                  </div>
                </Link>
              </ScrollFadeIn>

              <ScrollFadeIn delay={300} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <Link
                  href="/en-US/p/how-i-met-your-mother"
                  className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
                >
                  <figure className="px-10 pt-10">
                    <Image
                      src="/SampleBooks/How_I_met_your_mother.jpg"
                      alt={tHomePage('altTexts.adultBook')}
                      width={300}
                      height={300}
                      className="rounded-xl"
                    />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-2xl">{tHomePage('audiences.adults.title')}</h2>
                    <p>{tHomePage('audiences.adults.description')}</p>
                  </div>
                </Link>
              </ScrollFadeIn>

              <ScrollFadeIn delay={400} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <div className="card bg-base-100 shadow-xl">
                  <figure className="px-10 pt-10">
                    <Image
                      src="/SampleBooks/CaravanConcierge.jpg"
                      alt={tHomePage('altTexts.companyBook')}
                      width={300}
                      height={300}
                      className="rounded-xl"
                    />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-2xl">
                      {tHomePage('audiences.companies.title')}
                    </h2>
                    <p>{tHomePage('audiences.companies.description')}</p>
                  </div>
                </div>
              </ScrollFadeIn>
            </div>

            {/* Mobile Vertical List */}
            <div className="md:hidden space-y-6">
              <ScrollFadeIn delay={100} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <Link
                  href="/pt-PT/p/mateus-e-o-leo"
                  className="card bg-base-100 shadow-xl w-full mx-2 hover:shadow-2xl transition-shadow cursor-pointer"
                >
                  <figure className="p-4">
                    <Image
                      src="/SampleBooks/Mateus_e_o_leao.jpg"
                      alt={tHomePage('altTexts.kidsBook')}
                      width={1200}
                      height={1200}
                      className="w-full h-auto rounded-xl"
                    />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-xl">{tHomePage('audiences.kids.title')}</h2>
                    <p className="text-sm">{tHomePage('audiences.kids.description')}</p>
                  </div>
                </Link>
              </ScrollFadeIn>

              <ScrollFadeIn delay={200} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <Link
                  href="/pt-PT/p/juventude-de-gaia-no-mundial-de-clubes"
                  className="card bg-base-100 shadow-xl w-full mx-2 hover:shadow-2xl transition-shadow cursor-pointer"
                >
                  <figure className="p-4">
                    <Image
                      src="/SampleBooks/juventude_gaia.jpg"
                      alt={tHomePage('altTexts.groupsYearbooks')}
                      width={1200}
                      height={1200}
                      className="w-full h-auto rounded-xl"
                    />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-xl">{tHomePage('audiences.groups.title')}</h2>
                    <p className="text-sm">{tHomePage('audiences.groups.description')}</p>
                  </div>
                </Link>
              </ScrollFadeIn>

              <ScrollFadeIn delay={300} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <Link
                  href="/en-US/p/how-i-met-your-mother"
                  className="card bg-base-100 shadow-xl w-full mx-2 hover:shadow-2xl transition-shadow cursor-pointer"
                >
                  <figure className="p-4">
                    <Image
                      src="/SampleBooks/How_I_met_your_mother.jpg"
                      alt={tHomePage('altTexts.adultBook')}
                      width={1200}
                      height={1200}
                      className="w-full h-auto rounded-xl"
                    />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-xl">{tHomePage('audiences.adults.title')}</h2>
                    <p className="text-sm">{tHomePage('audiences.adults.description')}</p>
                  </div>
                </Link>
              </ScrollFadeIn>

              <ScrollFadeIn delay={400} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <div className="card bg-base-100 shadow-xl w-full mx-2">
                  <figure className="p-4">
                    <Image
                      src="/SampleBooks/CaravanConcierge.jpg"
                      alt={tHomePage('altTexts.companyBook')}
                      width={1200}
                      height={1200}
                      className="w-full h-auto rounded-xl"
                    />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-xl">{tHomePage('audiences.companies.title')}</h2>
                    <p className="text-sm">{tHomePage('audiences.companies.description')}</p>
                  </div>
                </div>
              </ScrollFadeIn>
            </div>
          </section>
        </ScrollFadeIn>

        <div className="divider my-16"></div>

        {/* What Drives Us Section */}
        <ScrollFadeIn threshold={0.1} rootMargin="0px 0px -20px 0px">
          <section className="my-16">
            <div className="max-w-4xl mx-auto text-center">
              <ScrollFadeIn delay={0} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <h2 className="text-4xl font-bold mb-8">{tHomePage('whatDrivesUs.title')}</h2>
              </ScrollFadeIn>
              <div className="prose prose-lg mx-auto">
                <ScrollFadeIn delay={100} threshold={0.1} rootMargin="0px 0px -20px 0px">
                  <p className="text-lg leading-relaxed mb-6">
                    {tHomePage('whatDrivesUs.paragraph1')}
                  </p>
                </ScrollFadeIn>
                <ScrollFadeIn delay={200} threshold={0.1} rootMargin="0px 0px -20px 0px">
                  <p className="text-lg leading-relaxed mb-6">
                    <strong>{tHomePage('whatDrivesUs.paragraph2Bold')}</strong>
                    {tHomePage('whatDrivesUs.paragraph2')
                      .replace(tHomePage('whatDrivesUs.paragraph2Bold'), '')
                      .replace('—', ' — ')}
                  </p>
                </ScrollFadeIn>
                <ScrollFadeIn delay={300} threshold={0.1} rootMargin="0px 0px -20px 0px">
                  <p className="text-lg leading-relaxed">
                    <Link
                      href={`/${locale}/aboutUs`}
                      className="link link-primary font-semibold hover:underline"
                    >
                      {tHomePage('whatDrivesUs.linkText')}
                    </Link>
                  </p>
                </ScrollFadeIn>
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        <div className="divider my-16"></div>

        {/* Why Choose Mythoria Section */}
        <ScrollFadeIn threshold={0.1} rootMargin="0px 0px -20px 0px">
          <WhyChooseMythoria />
        </ScrollFadeIn>

        <div className="divider my-16"></div>
        {/* How It Works Section */}
        <ScrollFadeIn threshold={0.1} rootMargin="0px 0px -20px 0px">
          <section id="how-it-works" className="my-16">
            <ScrollFadeIn delay={0} threshold={0.1} rootMargin="0px 0px -20px 0px">
              <h2 className="text-3xl font-bold text-center mb-10">
                {tHomePage('howItWorks.title')}
              </h2>
            </ScrollFadeIn>
            <ul className="timeline timeline-snap-icon max-md:timeline-compact timeline-vertical">
              <li>
                <div className="timeline-middle">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="timeline-start md:text-end mb-10">
                  <time className="font-mono italic">
                    {tHomePage('howItWorks.stepLabels.step1')}
                  </time>
                  <div className="text-lg font-black">
                    {tHomePage('howItWorks.steps.step1.title')}
                  </div>
                  {tHomePage('howItWorks.steps.step1.description')}
                </div>
                <hr />
              </li>
              <li>
                <hr />
                <div className="timeline-middle">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="timeline-end mb-10">
                  <time className="font-mono italic">
                    {tHomePage('howItWorks.stepLabels.step2')}
                  </time>
                  <div className="text-lg font-black">
                    {tHomePage('howItWorks.steps.step2.title')}
                  </div>
                  {tHomePage('howItWorks.steps.step2.description')}
                </div>
                <hr />
              </li>
              <li>
                <hr />
                <div className="timeline-middle">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="timeline-start md:text-end mb-10">
                  <time className="font-mono italic">
                    {tHomePage('howItWorks.stepLabels.step3')}
                  </time>
                  <div className="text-lg font-black">
                    {tHomePage('howItWorks.steps.step3.title')}
                  </div>
                  {tHomePage('howItWorks.steps.step3.description')}
                </div>
                <hr />
              </li>
              <li>
                <hr />
                <div className="timeline-middle">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="timeline-end mb-10">
                  <time className="font-mono italic">
                    {tHomePage('howItWorks.stepLabels.step4')}
                  </time>
                  <div className="text-lg font-black">
                    {tHomePage('howItWorks.steps.step4.title')}
                  </div>
                  {tHomePage('howItWorks.steps.step4.description')}
                </div>
                <hr />
              </li>
              <li>
                <hr />
                <div className="timeline-middle">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="timeline-start md:text-end mb-10">
                  <time className="font-mono italic">
                    {tHomePage('howItWorks.stepLabels.step5')}
                  </time>
                  <div className="text-lg font-black">
                    {tHomePage('howItWorks.steps.step5.title')}
                  </div>
                  {tHomePage('howItWorks.steps.step5.description')}
                </div>
                <hr />
              </li>
              <li>
                <hr />
                <div className="timeline-middle">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="timeline-end mb-10">
                  <time className="font-mono italic">
                    {tHomePage('howItWorks.stepLabels.step6')}
                  </time>
                  <div className="text-lg font-black">
                    {tHomePage('howItWorks.steps.step6.title')}
                  </div>
                  {tHomePage('howItWorks.steps.step6.description')}
                </div>
              </li>
            </ul>{' '}
            <ScrollFadeIn delay={100} threshold={0.1} rootMargin="0px 0px -20px 0px">
              <p className="text-center mt-8 text-lg">{tHomePage('howItWorks.conclusion')}</p>
            </ScrollFadeIn>
          </section>
        </ScrollFadeIn>
        {/* Story Counter Section */}
        <ScrollFadeIn threshold={0.1} rootMargin="0px 0px -20px 0px">
          <section className="my-16 text-center">
            <h2 className="text-3xl font-bold mb-4">{tHomePage('community.title')}</h2>
            <StoryCounter />
          </section>
        </ScrollFadeIn>

        {/* Call to Action Section - Only show if user is not signed in */}
        <Show when="signed-out">
          <ScrollFadeIn threshold={0.1} rootMargin="0px 0px -20px 0px">
            <section className="my-16">
              <div className="bg-gray-100 rounded-lg shadow-lg p-8 text-center">
                <h3 className="font-bold text-xl mb-4">{tHomePage('cta.title')}</h3>
                <div className="text-base mb-6">{tHomePage('cta.subtitle')}</div>
                <Link href={`/${locale}/sign-up`} className="btn btn-outline btn-primary btn-lg">
                  {tHomePage('cta.button')}
                </Link>
              </div>
            </section>
          </ScrollFadeIn>
        </Show>

        {/* Quote of the Day Section */}
        <ScrollFadeIn threshold={0.1} rootMargin="0px 0px -20px 0px">
          <section className="my-8">
            <QuoteOfTheDay />
          </section>
        </ScrollFadeIn>
      </div>
    </div>
  );
}
