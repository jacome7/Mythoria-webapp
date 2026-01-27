'use client';

import { useRef } from 'react';
import { FaMapMarkerAlt, FaHandshake } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import PartnershipForm from './PartnershipForm';
import ScrollFadeIn from './ScrollFadeIn';
import PartnersDirectorySection from './PartnersPrintersPageContent';

const PartnersPageContent = () => {
  const t = useTranslations('Partners');
  const directoryRef = useRef<HTMLDivElement>(null);
  const b2bRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToDirectory = () => {
    directoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToB2b = () => {
    b2bRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-16">
      <ScrollFadeIn>
        <section className="hero min-h-[60vh] bg-gradient-to-br from-base-100 via-base-200 to-base-100 rounded-box">
          <div className="hero-content text-center">
            <div className="max-w-4xl space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold text-primary">{t('hero.title')}</h1>
              <p className="text-xl md:text-2xl text-base-content/80">{t('hero.subtitle')}</p>
              <p className="text-lg md:text-xl text-base-content/80">{t('hero.body')}</p>
              <div className="flex flex-wrap justify-center gap-4">
                <button className="btn btn-primary btn-lg" onClick={scrollToDirectory}>
                  <FaMapMarkerAlt className="mr-2" />
                  {t('hero.ctaPrimary')}
                </button>
                <button className="btn btn-outline btn-lg" onClick={scrollToB2b}>
                  <FaHandshake className="mr-2" />
                  {t('hero.ctaSecondary')}
                </button>
              </div>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      <ScrollFadeIn delay={100}>
        <section ref={directoryRef}>
          <PartnersDirectorySection />
        </section>
      </ScrollFadeIn>

      <ScrollFadeIn delay={100}>
        <section ref={b2bRef} className="rounded-box bg-primary text-primary-content p-8 md:p-12">
          <div className="max-w-4xl mx-auto space-y-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">{t('b2b.title')}</h2>
            <p className="text-lg text-primary-content/80">{t('b2b.body')}</p>
            <button className="btn btn-secondary" onClick={scrollToForm}>
              {t('b2b.cta')}
            </button>
          </div>
        </section>
      </ScrollFadeIn>

      <ScrollFadeIn delay={100}>
        <section ref={formRef} className="max-w-4xl mx-auto">
          <PartnershipForm />
        </section>
      </ScrollFadeIn>
    </div>
  );
};

export default PartnersPageContent;
