'use client';

import { useRef } from 'react';
import { FaPrint, FaMapMarkerAlt, FaStore, FaHandshake, FaCheckCircle } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import PartnershipForm from './PartnershipForm';
import ScrollFadeIn from './ScrollFadeIn';

const PartnersPageContent = () => {
  const t = useTranslations('Partners');
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <ScrollFadeIn>
        <section className="hero min-h-[60vh] bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 rounded-box">
          <div className="hero-content text-center">
            <div className="max-w-3xl">
              <h1 className="text-5xl md:text-6xl font-bold text-primary mb-6">
                {t('hero.title')}
              </h1>
              <p className="text-xl md:text-2xl leading-relaxed mb-4">{t('hero.subtitle')}</p>
              <p className="text-xl md:text-2xl font-semibold text-primary mb-8">
                {t('hero.tagline')}
              </p>
              <button onClick={scrollToForm} className="btn btn-primary btn-lg">
                <FaHandshake className="mr-2" />
                {t('hero.cta')}
              </button>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* Partnership Types Section */}
      <ScrollFadeIn delay={100}>
        <section>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              {t('partnershipTypes.title')}
            </h2>
            <p className="text-xl text-base-content/80 max-w-3xl mx-auto">
              {t('partnershipTypes.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Printing Services */}
            <ScrollFadeIn delay={200}>
              <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="card-body">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 mx-auto">
                    <FaPrint className="text-3xl text-primary" />
                  </div>
                  <h3 className="card-title text-2xl justify-center mb-4">
                    {t('partnershipTypes.printing.title')}
                  </h3>
                  <p className="text-base-content/80 leading-relaxed">
                    {t('partnershipTypes.printing.description')}
                  </p>
                </div>
              </div>
            </ScrollFadeIn>

            {/* Attractions & Venues */}
            <ScrollFadeIn delay={300}>
              <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="card-body">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 mx-auto">
                    <FaMapMarkerAlt className="text-3xl text-primary" />
                  </div>
                  <h3 className="card-title text-2xl justify-center mb-4">
                    {t('partnershipTypes.attractions.title')}
                  </h3>
                  <p className="text-base-content/80 leading-relaxed">
                    {t('partnershipTypes.attractions.description')}
                  </p>
                </div>
              </div>
            </ScrollFadeIn>

            {/* Retailers & Brands */}
            <ScrollFadeIn delay={400}>
              <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="card-body">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 mx-auto">
                    <FaStore className="text-3xl text-primary" />
                  </div>
                  <h3 className="card-title text-2xl justify-center mb-4">
                    {t('partnershipTypes.retailers.title')}
                  </h3>
                  <p className="text-base-content/80 leading-relaxed">
                    {t('partnershipTypes.retailers.description')}
                  </p>
                </div>
              </div>
            </ScrollFadeIn>
          </div>
        </section>
      </ScrollFadeIn>

      {/* How It Works Section */}
      <ScrollFadeIn delay={100}>
        <section className="bg-base-200 rounded-box p-8 md:p-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              {t('howItWorks.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <ScrollFadeIn delay={200}>
              <div className="text-center">
                <div className="flex items-center justify-center w-20 h-20 bg-primary text-primary-content rounded-full text-3xl font-bold mb-4 mx-auto">
                  1
                </div>
                <h3 className="text-2xl font-bold mb-3">{t('howItWorks.step1.title')}</h3>
                <p className="text-base-content/80 leading-relaxed">
                  {t('howItWorks.step1.description')}
                </p>
              </div>
            </ScrollFadeIn>

            {/* Step 2 */}
            <ScrollFadeIn delay={300}>
              <div className="text-center">
                <div className="flex items-center justify-center w-20 h-20 bg-secondary text-secondary-content rounded-full text-3xl font-bold mb-4 mx-auto">
                  2
                </div>
                <h3 className="text-2xl font-bold mb-3">{t('howItWorks.step2.title')}</h3>
                <p className="text-base-content/80 leading-relaxed">
                  {t('howItWorks.step2.description')}
                </p>
              </div>
            </ScrollFadeIn>

            {/* Step 3 */}
            <ScrollFadeIn delay={400}>
              <div className="text-center">
                <div className="flex items-center justify-center w-20 h-20 bg-accent text-accent-content rounded-full text-3xl font-bold mb-4 mx-auto">
                  3
                </div>
                <h3 className="text-2xl font-bold mb-3">{t('howItWorks.step3.title')}</h3>
                <p className="text-base-content/80 leading-relaxed">
                  {t('howItWorks.step3.description')}
                </p>
              </div>
            </ScrollFadeIn>
          </div>
        </section>
      </ScrollFadeIn>

      {/* Partner Application Form Section */}
      <ScrollFadeIn delay={100}>
        <section ref={formRef} className="max-w-4xl mx-auto">
          <PartnershipForm />
        </section>
      </ScrollFadeIn>

      {/* Benefits Highlight */}
      <ScrollFadeIn delay={100}>
        <section className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-box p-8 md:p-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
              {t('benefits.title')}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <FaCheckCircle className="text-2xl text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg mb-2">{t('benefits.accessFamilies.title')}</h3>
                  <p className="text-base-content/80">{t('benefits.accessFamilies.description')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <FaCheckCircle className="text-2xl text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg mb-2">
                    {t('benefits.seamlessIntegration.title')}
                  </h3>
                  <p className="text-base-content/80">
                    {t('benefits.seamlessIntegration.description')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <FaCheckCircle className="text-2xl text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg mb-2">{t('benefits.recurringRevenue.title')}</h3>
                  <p className="text-base-content/80">
                    {t('benefits.recurringRevenue.description')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <FaCheckCircle className="text-2xl text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg mb-2">{t('benefits.brandAssociation.title')}</h3>
                  <p className="text-base-content/80">
                    {t('benefits.brandAssociation.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollFadeIn>
    </div>
  );
};

export default PartnersPageContent;
