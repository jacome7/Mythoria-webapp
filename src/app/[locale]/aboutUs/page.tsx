'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import AnimatedLogo from '@/components/AnimatedLogo';
import ScrollFadeIn from '@/components/ScrollFadeIn';

export default function AboutUsPage() {
  const t = useTranslations('AboutUs');
  const [showRodrigoSmile, setShowRodrigoSmile] = useState(false);
  const [showAndreSmile, setShowAndreSmile] = useState(false);
  const [showOumpaLoompaSmile, setShowOumpaLoompaSmile] = useState(false);

  // Preload smiling images
  useEffect(() => {
    const img1 = new window.Image();
    img1.src = '/images/AboutUs/Rodrigo_smiling.jpg';
    const img2 = new window.Image();
    img2.src = '/images/AboutUs/Andre_smiling.jpg';
    const img3 = new window.Image();
    img3.src = '/images/AboutUs/Oumpalumpas_smiling.jpg';
  }, []);
  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="container mx-auto px-4 py-4">
        {/* Hero Section */}
        <ScrollFadeIn>
          <header className="hero min-h-[40vh] bg-base-200 rounded-box my-4">
            <div className="hero-content flex-col lg:flex-row w-full">
              <div className="lg:w-1/2 text-center lg:text-left">
                <h1 className="text-4xl md:text-5xl font-bold text-primary mb-8">
                  ✨ {t('hero.title')}
                </h1>
                <p className="text-lg leading-relaxed">{t('hero.intro')}</p>
                <p className="py-6 text-xl font-semibold text-primary">{t('hero.tagline')}</p>
              </div>
              {/* Right Side: Logo */}
              <div className="lg:w-1/2 flex justify-center lg:justify-end mt-4 lg:mt-0">
                <AnimatedLogo />
              </div>
            </div>
          </header>
        </ScrollFadeIn>

        {/* Mission Section */}
        <ScrollFadeIn delay={100}>
          <section className="my-16">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-8 md:p-12">
                <h2 className="card-title text-3xl md:text-4xl font-bold mb-6 text-primary">
                  {t('mission.title')}
                </h2>
                <div className="space-y-4 text-lg leading-relaxed">
                  <p>{t('mission.paragraph1')}</p>
                  <p>{t('mission.paragraph2')}</p>
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        {/* Team Section */}
        <ScrollFadeIn delay={200}>
          <section className="my-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                {t('team.title')}
              </h2>
              <p className="text-lg">{t('team.subtitle')}</p>
            </div>

            <div className="space-y-12">
              {/* Rodrigo Jácome */}
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <div className="flex flex-col lg:flex-row gap-8 items-center">
                    <div className="lg:w-1/3 flex justify-center">
                      <div
                        className="avatar cursor-pointer relative group"
                        onMouseEnter={() => setShowRodrigoSmile(true)}
                        onMouseLeave={() => setShowRodrigoSmile(false)}
                        onClick={() => setShowRodrigoSmile(!showRodrigoSmile)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowRodrigoSmile(!showRodrigoSmile);
                          }
                        }}
                        aria-label={t('team.rodrigo.ariaLabel')}
                      >
                        <div className="w-48 h-48 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden relative">
                          <Image
                            src="/images/AboutUs/Rodrigo.jpg"
                            alt="Rodrigo Jácome"
                            width={192}
                            height={192}
                            className={`object-cover transition-opacity duration-500 ${showRodrigoSmile ? 'opacity-0' : 'opacity-100'}`}
                            priority
                          />
                          <Image
                            src="/images/AboutUs/Rodrigo_smiling.jpg"
                            alt={t('team.rodrigo.altSmiling')}
                            width={192}
                            height={192}
                            className={`object-cover absolute inset-0 transition-opacity duration-500 ${showRodrigoSmile ? 'opacity-100' : 'opacity-0'}`}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="lg:w-2/3 text-center lg:text-left">
                      <h3 className="text-2xl md:text-3xl font-bold mb-2">
                        {t('team.rodrigo.title')}
                      </h3>
                      <p className="text-lg leading-relaxed">{t('team.rodrigo.description')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* André Silva */}
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <div className="flex flex-col lg:flex-row-reverse gap-8 items-center">
                    <div className="lg:w-1/3 flex justify-center">
                      <div
                        className="avatar cursor-pointer relative group"
                        onMouseEnter={() => setShowAndreSmile(true)}
                        onMouseLeave={() => setShowAndreSmile(false)}
                        onClick={() => setShowAndreSmile(!showAndreSmile)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowAndreSmile(!showAndreSmile);
                          }
                        }}
                        aria-label={t('team.andre.ariaLabel')}
                      >
                        <div className="w-48 h-48 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden relative">
                          <Image
                            src="/images/AboutUs/Andre.jpg"
                            alt="André Silva"
                            width={192}
                            height={192}
                            className={`object-cover transition-opacity duration-500 ${showAndreSmile ? 'opacity-0' : 'opacity-100'}`}
                            priority
                          />
                          <Image
                            src="/images/AboutUs/Andre_smiling.jpg"
                            alt={t('team.andre.altSmiling')}
                            width={192}
                            height={192}
                            className={`object-cover absolute inset-0 transition-opacity duration-500 ${showAndreSmile ? 'opacity-100' : 'opacity-0'}`}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="lg:w-2/3 text-center lg:text-left">
                      <h3 className="text-2xl md:text-3xl font-bold mb-2">
                        {t('team.andre.title')}
                      </h3>
                      <p className="text-lg leading-relaxed">{t('team.andre.description')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Team */}
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <div className="flex flex-col lg:flex-row gap-8 items-center">
                    <div className="lg:w-1/3 flex justify-center">
                      <div
                        className="avatar cursor-pointer relative group"
                        onMouseEnter={() => setShowOumpaLoompaSmile(true)}
                        onMouseLeave={() => setShowOumpaLoompaSmile(false)}
                        onClick={() => setShowOumpaLoompaSmile(!showOumpaLoompaSmile)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowOumpaLoompaSmile(!showOumpaLoompaSmile);
                          }
                        }}
                        aria-label={t('team.oumpaLoompas.ariaLabel')}
                      >
                        <div className="w-48 h-48 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden relative">
                          <Image
                            src="/images/AboutUs/Oumpalumpas.jpg"
                            alt="Oumpa-Loompas"
                            width={192}
                            height={192}
                            className={`object-cover transition-opacity duration-500 ${showOumpaLoompaSmile ? 'opacity-0' : 'opacity-100'}`}
                            priority
                          />
                          <Image
                            src="/images/AboutUs/Oumpalumpas_smiling.jpg"
                            alt={t('team.oumpaLoompas.altSmiling')}
                            width={192}
                            height={192}
                            className={`object-cover absolute inset-0 transition-opacity duration-500 ${showOumpaLoompaSmile ? 'opacity-100' : 'opacity-0'}`}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="lg:w-2/3 text-center lg:text-left">
                      <h3 className="text-2xl md:text-3xl font-bold mb-4">
                        {t('team.oumpaLoompas.title')}
                      </h3>
                      <p className="text-lg leading-relaxed">
                        {t('team.oumpaLoompas.description')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        {/* Commitment Section */}
        <ScrollFadeIn delay={100}>
          <section className="my-16">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-8 md:p-12">
                <h2 className="card-title text-3xl md:text-4xl font-bold mb-6 text-primary">
                  {t('commitment.title')}
                </h2>
                <div className="space-y-4 text-lg leading-relaxed">
                  <p>{t('commitment.paragraph1')}</p>
                  <p>{t('commitment.paragraph2')}</p>
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        {/* Our Story Section */}
        <ScrollFadeIn delay={200}>
          <section className="my-16">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-8 md:p-12">
                <h2 className="card-title text-3xl md:text-4xl font-bold mb-6 text-primary">
                  {t('ourStory.title')}
                </h2>
                <div className="space-y-4 text-lg leading-relaxed">
                  <p>{t('ourStory.paragraph1')}</p>
                  <p>
                    {t('ourStory.paragraph2Start')}{' '}
                    <a
                      href="https://inovagaia.pt/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary font-semibold hover:underline"
                    >
                      {t('ourStory.inovaGaiaText')}
                    </a>{' '}
                    {t('ourStory.paragraph2End')}
                  </p>
                  <p>{t('ourStory.paragraph3')}</p>
                  <div className="flex justify-center mt-6">
                    <Link href="/p/mythoria-a-vision-unfolding" className="btn btn-primary btn-lg">
                      📖 {t('ourStory.button')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        {/* Company Transparency Section */}
        <ScrollFadeIn delay={100}>
          <section className="my-16">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body p-8 md:p-12">
                <h2 className="card-title text-3xl md:text-4xl font-bold mb-6 text-primary">
                  {t('transparency.title')}
                </h2>
                <p className="text-lg leading-relaxed">
                  {t('transparency.textStart')} <strong>{t('transparency.companyName')}</strong>
                  {t('transparency.textEnd')}
                </p>
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        {/* Partners Section */}
        <ScrollFadeIn delay={100}>
          <section className="my-16">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-8 md:p-12">
                <h2 className="card-title text-3xl md:text-4xl font-bold mb-6 text-primary">
                  {t('partners.title')}
                </h2>
                <div className="space-y-8">
                  {/* InovaGaia */}
                  <div className="flex flex-col lg:flex-row gap-8 items-center">
                    <div className="lg:w-2/5 flex justify-center">
                      <div className="relative w-full max-w-xs">
                        <Image
                          src="/images/AboutUs/inovagaia_768x183.png"
                          alt="InovaGaia"
                          width={768}
                          height={183}
                          className="rounded-lg"
                          priority
                        />
                      </div>
                    </div>
                    <div className="lg:w-3/5 text-center lg:text-left">
                      <p className="text-lg leading-relaxed">{t('partners.inovaGaia')}</p>
                    </div>
                  </div>

                  {/* Google for Startups */}
                  <div className="flex flex-col lg:flex-row-reverse gap-8 items-center">
                    <div className="lg:w-2/5 flex justify-center">
                      <div className="relative w-full max-w-xs">
                        <Image
                          src="/images/AboutUs/google-for-startups_768x243.jpg"
                          alt="Google for Startups"
                          width={768}
                          height={243}
                          className="rounded-lg"
                          priority
                        />
                      </div>
                    </div>
                    <div className="lg:w-3/5 text-center lg:text-left">
                      <p className="text-lg leading-relaxed">{t('partners.googleForStartups')}</p>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="text-center mt-8 text-sm text-base-content/60">
                    <p>* {t('partners.disclaimer')}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        {/* Closing Message */}
        <ScrollFadeIn delay={200}>
          <section className="my-16 text-center">
            <div className="hero bg-primary text-primary-content rounded-box">
              <div className="hero-content py-12">
                <div className="max-w-2xl">
                  <p className="text-2xl font-bold">{t('closing.title')}</p>
                  <p className="text-xl mt-4">{t('closing.subtitle')}</p>
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      </div>
    </div>
  );
}
