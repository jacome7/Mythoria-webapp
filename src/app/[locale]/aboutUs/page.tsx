'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import ScrollFadeIn from '@/components/ScrollFadeIn';
import styles from './AboutUsPage.module.css';

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
    <div className={styles.page}>
      <div className="container mx-auto px-4 py-4">
        {/* Hero Section */}
        <ScrollFadeIn>
          <header className={`${styles.hero} my-4`}>
            <Image
              src="/homepage/kids_fantasy/yellow_star.webp"
              alt=""
              width={128}
              height={134}
              className={styles.heroStarLeft}
              aria-hidden="true"
            />
            <Image
              src="/homepage/kids_fantasy/yellow_star_1.webp"
              alt=""
              width={128}
              height={136}
              className={styles.heroStarRight}
              aria-hidden="true"
            />
            <Image
              src="/homepage/kids_fantasy/white_cloud_1.webp"
              alt=""
              width={200}
              height={135}
              className={styles.heroCloud}
              aria-hidden="true"
            />
            <div className={styles.heroContent}>
              <div className={styles.heroText}>
                <h1 className="font-display mb-6 text-4xl font-bold leading-tight text-[color:var(--about-navy)] md:text-6xl">
                  {t('hero.title')}
                </h1>
                <p className="text-lg leading-relaxed text-base-content/80">{t('hero.intro')}</p>
                <p className="font-display py-6 text-2xl font-bold text-[color:var(--about-navy)]">
                  {t('hero.tagline')}
                </p>
              </div>
              <div className={styles.logoStage}>
                <Image
                  src="/images/logo/papercut.jpg"
                  alt="Mythoria"
                  width={1024}
                  height={1024}
                  sizes="(min-width: 1024px) 320px, 240px"
                  className={styles.logoImage}
                  priority
                />
              </div>
            </div>
          </header>
        </ScrollFadeIn>

        {/* Mission Section */}
        <ScrollFadeIn delay={100}>
          <section className="my-16">
            <div className={styles.paperCard}>
              <div className="p-8 md:p-12">
                <h2 className="font-display mb-6 text-3xl font-bold text-[color:var(--about-navy)] md:text-4xl">
                  {t('mission.title')}
                </h2>
                <div className="space-y-4 text-lg leading-relaxed text-base-content/80">
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
              <h2 className="font-display mb-4 text-3xl font-bold text-[color:var(--about-navy)] md:text-5xl">
                {t('team.title')}
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-base-content/80">{t('team.subtitle')}</p>
            </div>

            <div className="space-y-12">
              {/* Rodrigo Jácome */}
              <div className={styles.paperCard}>
                <div className="p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row gap-8 items-center">
                    <div className="lg:w-1/3 flex justify-center">
                      <div
                        className={styles.avatarButton}
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
                        <div className={styles.avatarFrame}>
                          <Image
                            src="/images/AboutUs/Rodrigo.jpg"
                            alt="Rodrigo Jácome"
                            width={192}
                            height={192}
                            className={`h-full w-full object-cover transition-opacity duration-500 ${showRodrigoSmile ? 'opacity-0' : 'opacity-100'}`}
                            priority
                          />
                          <Image
                            src="/images/AboutUs/Rodrigo_smiling.jpg"
                            alt={t('team.rodrigo.altSmiling')}
                            width={192}
                            height={192}
                            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${showRodrigoSmile ? 'opacity-100' : 'opacity-0'}`}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="lg:w-2/3 text-center lg:text-left">
                      <h3 className="font-display mb-3 text-2xl font-bold text-[color:var(--about-navy)] md:text-3xl">
                        {t('team.rodrigo.title')}
                      </h3>
                      <p className="text-lg leading-relaxed text-base-content/80">
                        {t('team.rodrigo.description')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* André Silva */}
              <div className={styles.paperCard}>
                <div className="p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row-reverse gap-8 items-center">
                    <div className="lg:w-1/3 flex justify-center">
                      <div
                        className={styles.avatarButton}
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
                        <div className={styles.avatarFrame}>
                          <Image
                            src="/images/AboutUs/Andre.jpg"
                            alt="André Silva"
                            width={192}
                            height={192}
                            className={`h-full w-full object-cover transition-opacity duration-500 ${showAndreSmile ? 'opacity-0' : 'opacity-100'}`}
                            priority
                          />
                          <Image
                            src="/images/AboutUs/Andre_smiling.jpg"
                            alt={t('team.andre.altSmiling')}
                            width={192}
                            height={192}
                            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${showAndreSmile ? 'opacity-100' : 'opacity-0'}`}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="lg:w-2/3 text-center lg:text-left">
                      <h3 className="font-display mb-3 text-2xl font-bold text-[color:var(--about-navy)] md:text-3xl">
                        {t('team.andre.title')}
                      </h3>
                      <p className="text-lg leading-relaxed text-base-content/80">
                        {t('team.andre.description')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Team */}
              <div className={styles.paperCard}>
                <div className="p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row gap-8 items-center">
                    <div className="lg:w-1/3 flex justify-center">
                      <div
                        className={styles.avatarButton}
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
                        <div className={styles.avatarFrame}>
                          <Image
                            src="/images/AboutUs/Oumpalumpas.jpg"
                            alt="Oumpa-Loompas"
                            width={192}
                            height={192}
                            className={`h-full w-full object-cover transition-opacity duration-500 ${showOumpaLoompaSmile ? 'opacity-0' : 'opacity-100'}`}
                            priority
                          />
                          <Image
                            src="/images/AboutUs/Oumpalumpas_smiling.jpg"
                            alt={t('team.oumpaLoompas.altSmiling')}
                            width={192}
                            height={192}
                            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${showOumpaLoompaSmile ? 'opacity-100' : 'opacity-0'}`}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="lg:w-2/3 text-center lg:text-left">
                      <h3 className="font-display mb-3 text-2xl font-bold text-[color:var(--about-navy)] md:text-3xl">
                        {t('team.oumpaLoompas.title')}
                      </h3>
                      <p className="text-lg leading-relaxed text-base-content/80">
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
            <div className={styles.paperCard}>
              <div className="p-8 md:p-12">
                <h2 className="font-display mb-6 text-3xl font-bold text-[color:var(--about-navy)] md:text-4xl">
                  {t('commitment.title')}
                </h2>
                <div className="space-y-4 text-lg leading-relaxed text-base-content/80">
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
            <div className={styles.paperCard}>
              <div className="p-8 md:p-12">
                <h2 className="font-display mb-6 text-3xl font-bold text-[color:var(--about-navy)] md:text-4xl">
                  {t('ourStory.title')}
                </h2>
                <div className="space-y-4 text-lg leading-relaxed text-base-content/80">
                  <p>{t('ourStory.paragraph1')}</p>
                  <p>
                    {t('ourStory.paragraph2Start')}{' '}
                    <a
                      href="https://inovagaia.pt/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[color:var(--about-navy)] underline-offset-4 hover:underline"
                    >
                      {t('ourStory.inovaGaiaText')}
                    </a>{' '}
                    {t('ourStory.paragraph2End')}
                  </p>
                  <p>{t('ourStory.paragraph3')}</p>
                  <div className="flex justify-center mt-6">
                    <Link href="/p/mythoria-a-vision-unfolding" className={styles.primaryButton}>
                      {t('ourStory.button')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        {/* Partners Section */}
        <ScrollFadeIn delay={100}>
          <section className="my-16">
            <div className={styles.paperCard}>
              <div className="p-8 md:p-12">
                <h2 className="font-display mb-8 text-3xl font-bold text-[color:var(--about-navy)] md:text-4xl">
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
                          className={styles.partnerLogo}
                          priority
                        />
                      </div>
                    </div>
                    <div className="lg:w-3/5 text-center lg:text-left">
                      <p className="text-lg leading-relaxed text-base-content/80">
                        {t('partners.inovaGaia')}
                      </p>
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
                          className={styles.partnerLogo}
                          priority
                        />
                      </div>
                    </div>
                    <div className="lg:w-3/5 text-center lg:text-left">
                      <p className="text-lg leading-relaxed text-base-content/80">
                        {t('partners.googleForStartups')}
                      </p>
                    </div>
                  </div>

                  {/* ElevenLabs */}
                  <div className="flex flex-col lg:flex-row gap-8 items-center">
                    <div className="lg:w-2/5 flex justify-center">
                      <div className="relative w-full max-w-xs flex justify-center">
                        <a
                          href="https://elevenlabs.io/startup-grants"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Image
                            src="https://eleven-public-cdn.elevenlabs.io/payloadcms/pwsc4vchsqt-ElevenLabsGrants.webp"
                            alt="ElevenLabs"
                            width={250}
                            height={100}
                            style={{ width: '250px', height: 'auto' }}
                            className={styles.partnerLogo}
                          />
                        </a>
                      </div>
                    </div>
                    <div className="lg:w-3/5 text-center lg:text-left">
                      <p className="text-lg leading-relaxed text-base-content/80">
                        {t('partners.elevenLabs')}
                      </p>
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

        {/* Company Transparency Section */}
        <ScrollFadeIn delay={100}>
          <section className="my-16">
            <div className={styles.paperCard}>
              <div className="p-8 md:p-12">
                <h2 className="font-display mb-6 text-3xl font-bold text-[color:var(--about-navy)] md:text-4xl">
                  {t('transparency.title')}
                </h2>
                <p className="text-lg leading-relaxed text-base-content/80">
                  {t('transparency.textStart')} <strong>{t('transparency.companyName')}</strong>
                  {t('transparency.textEnd')}
                </p>
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        {/* Closing Message */}
        <ScrollFadeIn delay={200}>
          <section className="my-16 text-center">
            <div className={styles.closingCard}>
              <Image
                src="/homepage/kids_fantasy/yellow_star_2.webp"
                alt=""
                width={128}
                height={127}
                className={styles.closingStar}
                aria-hidden="true"
              />
              <div className="relative z-10 mx-auto max-w-2xl py-12 px-6">
                <div>
                  <p className="font-display text-3xl font-bold leading-tight text-[color:var(--about-navy)]">
                    {t('closing.title')}
                  </p>
                  <p className="mt-4 text-xl leading-relaxed text-base-content/80">
                    {t('closing.subtitle')}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      </div>
    </div>
  );
}
