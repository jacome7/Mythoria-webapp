'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Show } from '@clerk/nextjs';
import StoryCounter from '@/components/StoryCounter';
import QuoteOfTheDay from '@/components/QuoteOfTheDay';
import WhyChooseMythoria from '@/components/WhyChooseMythoria';
import HowItWorks from '@/components/HowItWorks';
import HomepageCta from '@/components/HomepageCta';
import ScrollFadeIn from '@/components/ScrollFadeIn';
import PaperCutHero from '@/components/papercut/PaperCutHero';

export default function Home() {
  const tHomePage = useTranslations('HomePage');
  const locale = useLocale();

  return (
    <div className="homepage-paper-bg min-h-screen text-base-content">
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
                  className="card homepage-audience-card homepage-audience-card-kids shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
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
                    <h2 className="card-title font-display text-2xl text-[color:var(--color-primary)]">
                      {tHomePage('audiences.kids.title')}
                    </h2>
                    <p>{tHomePage('audiences.kids.description')}</p>
                  </div>
                </Link>
              </ScrollFadeIn>

              <ScrollFadeIn delay={200} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <Link
                  href="/pt-PT/p/juventude-de-gaia-no-mundial-de-clubes"
                  className="card homepage-audience-card homepage-audience-card-kids shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
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
                    <h2 className="card-title font-display text-2xl text-[color:var(--color-primary)]">
                      {tHomePage('audiences.groups.title')}
                    </h2>
                    <p>{tHomePage('audiences.groups.description')}</p>
                  </div>
                </Link>
              </ScrollFadeIn>

              <ScrollFadeIn delay={300} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <Link
                  href="/en-US/p/how-i-met-your-mother"
                  className="card homepage-audience-card homepage-audience-card-kids shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
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
                    <h2 className="card-title font-display text-2xl text-[color:var(--color-primary)]">
                      {tHomePage('audiences.adults.title')}
                    </h2>
                    <p>{tHomePage('audiences.adults.description')}</p>
                  </div>
                </Link>
              </ScrollFadeIn>

              <ScrollFadeIn delay={400} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <div className="card homepage-audience-card homepage-audience-card-kids shadow-xl">
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
                    <h2 className="card-title font-display text-2xl text-[color:var(--color-primary)]">
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
                  className="card homepage-audience-card homepage-audience-card-kids shadow-xl w-full mx-2 hover:shadow-2xl transition-shadow cursor-pointer"
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
                    <h2 className="card-title font-display text-xl text-[color:var(--color-primary)]">
                      {tHomePage('audiences.kids.title')}
                    </h2>
                    <p className="text-sm">{tHomePage('audiences.kids.description')}</p>
                  </div>
                </Link>
              </ScrollFadeIn>

              <ScrollFadeIn delay={200} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <Link
                  href="/pt-PT/p/juventude-de-gaia-no-mundial-de-clubes"
                  className="card homepage-audience-card homepage-audience-card-kids shadow-xl w-full mx-2 hover:shadow-2xl transition-shadow cursor-pointer"
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
                    <h2 className="card-title font-display text-xl text-[color:var(--color-primary)]">
                      {tHomePage('audiences.groups.title')}
                    </h2>
                    <p className="text-sm">{tHomePage('audiences.groups.description')}</p>
                  </div>
                </Link>
              </ScrollFadeIn>

              <ScrollFadeIn delay={300} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <Link
                  href="/en-US/p/how-i-met-your-mother"
                  className="card homepage-audience-card homepage-audience-card-kids shadow-xl w-full mx-2 hover:shadow-2xl transition-shadow cursor-pointer"
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
                    <h2 className="card-title font-display text-xl text-[color:var(--color-primary)]">
                      {tHomePage('audiences.adults.title')}
                    </h2>
                    <p className="text-sm">{tHomePage('audiences.adults.description')}</p>
                  </div>
                </Link>
              </ScrollFadeIn>

              <ScrollFadeIn delay={400} threshold={0.1} rootMargin="0px 0px -20px 0px">
                <div className="card homepage-audience-card homepage-audience-card-kids shadow-xl w-full mx-2">
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
                    <h2 className="card-title font-display text-xl text-[color:var(--color-primary)]">
                      {tHomePage('audiences.companies.title')}
                    </h2>
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
                <h2 className="font-display text-4xl font-bold mb-8 text-[color:var(--color-primary)]">
                  {tHomePage('whatDrivesUs.title')}
                </h2>
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
          <HowItWorks />
        </ScrollFadeIn>
        {/* Story Counter Section */}
        <ScrollFadeIn threshold={0.1} rootMargin="0px 0px -20px 0px">
          <section className="my-16 text-center">
            <h2 className="font-display mx-auto mb-6 max-w-4xl text-4xl font-bold leading-tight text-[color:var(--color-primary)]">
              {tHomePage('community.title')}
            </h2>
            <StoryCounter />
          </section>
        </ScrollFadeIn>

        {/* Call to Action Section - Only show if user is not signed in */}
        <Show when="signed-out">
          <ScrollFadeIn threshold={0.1} rootMargin="0px 0px -20px 0px">
            <HomepageCta />
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
