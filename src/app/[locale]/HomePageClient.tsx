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
import HomepageBookGallery from '@/components/HomepageBookGallery';
import type { IntentContext } from '@/types/intent-context';

interface HomePageClientProps {
  initialHeroIntentOverride?: string | null;
  initialIntentContext?: IntentContext | null;
  intentOverrideActive?: boolean;
}

const portugueseLandingPageGuides = [
  {
    href: '/pt-PT/lp/livro-personalizado-avos-netos',
    title: 'Livro personalizado para avós e netos',
    description: 'Ideias para guardar memórias, tradições e aventuras partilhadas em família.',
  },
  {
    href: '/pt-PT/lp/livro-personalizado-para-casais',
    title: 'Livro personalizado para casais',
    description: 'Uma prenda romântica construída com momentos e detalhes que só o casal conhece.',
  },
  {
    href: '/pt-PT/lp/livro-personalizado-criancas-autistas',
    title: 'Livros para crianças com PEA ou PHDA',
    description:
      'Histórias personalizadas, previsíveis e cuidadosas, sempre sob controlo do adulto.',
  },
  {
    href: '/pt-PT/lp/historias-de-apoio',
    title: 'Histórias de apoio para desafios da vida',
    description: 'Exemplos ficcionais para conversar sobre mudanças e emoções com segurança.',
  },
  {
    href: '/pt-PT/lp/workshops-criancas',
    title: 'Workshops criativos para crianças',
    description: 'Atividades guiadas para transformar ideias de grupo em histórias personalizadas.',
  },
] as const;

export default function HomePageClient({
  initialHeroIntentOverride = null,
  initialIntentContext = null,
  intentOverrideActive = false,
}: HomePageClientProps) {
  const tHomePage = useTranslations('HomePage');
  const locale = useLocale();

  return (
    <div className="homepage-paper-bg min-h-screen text-base-content">
      <PaperCutHero
        initialIntentOverride={initialHeroIntentOverride}
        initialIntentContext={initialIntentContext}
      />
      <HomepageBookGallery
        initialIntentContext={initialIntentContext}
        intentOverrideActive={intentOverrideActive}
      />
      <div className="container mx-auto px-4 py-4">
        {/* Audience Sections */}
        <ScrollFadeIn threshold={0.1} rootMargin="0px 0px -20px 0px">
          <section className="mt-6 mb-16">
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

        {locale === 'pt-PT' ? (
          <>
            <div className="divider my-16"></div>
            <ScrollFadeIn threshold={0.1} rootMargin="0px 0px -20px 0px">
              <section className="my-16" aria-labelledby="homepage-guides-title">
                <div className="mx-auto max-w-4xl text-center">
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                    Guias Mythoria
                  </p>
                  <h2
                    id="homepage-guides-title"
                    className="font-display mt-2 text-4xl font-bold text-[color:var(--color-primary)]"
                  >
                    Encontre a história certa para cada pessoa e ocasião
                  </h2>
                  <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-base-content/75">
                    Explore ideias, exemplos ficcionais e opções de personalização antes de começar
                    o seu livro.
                  </p>
                </div>
                <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {portugueseLandingPageGuides.map((guide) => (
                    <article
                      key={guide.href}
                      className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
                    >
                      <h3 className="font-display text-xl font-bold text-[color:var(--color-primary)]">
                        {guide.title}
                      </h3>
                      <p className="mt-3 leading-relaxed text-base-content/70">
                        {guide.description}
                      </p>
                      <Link
                        href={guide.href}
                        className="mt-5 inline-flex font-semibold text-primary hover:underline"
                      >
                        Explorar {guide.title.toLocaleLowerCase('pt-PT')}
                      </Link>
                    </article>
                  ))}
                </div>
                <div className="mt-8 text-center">
                  <Link href="/pt-PT/lp" className="btn btn-outline btn-primary">
                    Ver todos os guias para livros personalizados
                  </Link>
                </div>
              </section>
            </ScrollFadeIn>
          </>
        ) : null}

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
