'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const AboutUsPage = () => {
  const t = useTranslations('AboutUs');
  const tModal = useTranslations('AboutUsModal');

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header Section */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-primary">{t('hero.title')}</h1>
          <p className="text-xl mt-4 text-gray-700">{t('hero.subtitle')}</p>
        </header>

        {/* Founder Section */}
        <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Image */}
              <div className="flex justify-center lg:justify-start order-2 lg:order-1">
                <div className="relative">
                  <div className="avatar">
                    <div className="w-64 md:w-80 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                      <Image 
                        src="/AboutUs.jpg"
                        alt={t('founder.imageAlt')}
                        width={320}
                        height={320}
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                  <div className="badge badge-secondary absolute -top-2 -right-2 p-3 font-semibold">
                    {t('founder.ageLabel')}
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="text-center lg:text-left order-1 lg:order-2">
                <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-6">
                  {t('founder.title')}
                </h2>
                <p className="text-lg text-base-content/80 leading-relaxed mb-6">
                  {t('founder.description')}
                </p>
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                  <div className="badge badge-outline">{t('founder.badges.founder')}</div>
                  <div className="badge badge-outline">{t('founder.badges.aiEnthusiast')}</div>
                  <div className="badge badge-outline">{t('founder.badges.storyteller')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Team Section */}
      <section className="py-16 md:py-24 bg-base-200">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-4">
                {t('aiTeam.title')}
              </h2>
              <p className="text-base-content/60 max-w-2xl mx-auto">
                {t('aiTeam.subtitle')}
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Quill-Bot */}
              <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="card-body items-center text-center p-8">
                  <div className="text-5xl mb-4">✍️</div>
                  <h3 className="card-title text-primary mb-3">
                    {t('aiTeam.quillBot.name')}
                  </h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    {t('aiTeam.quillBot.description')}
                  </p>
                </div>
              </div>

              {/* Brush-Bot */}
              <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="card-body items-center text-center p-8">
                  <div className="text-5xl mb-4">🎨</div>
                  <h3 className="card-title text-primary mb-3">
                    {t('aiTeam.brushBot.name')}
                  </h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    {t('aiTeam.brushBot.description')}
                  </p>
                </div>
              </div>

              {/* Voice-Bot */}
              <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="card-body items-center text-center p-8">
                  <div className="text-5xl mb-4">🎙️</div>
                  <h3 className="card-title text-primary mb-3">
                    {t('aiTeam.voiceBot.name')}
                  </h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    {t('aiTeam.voiceBot.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Progress Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-4">
                {t('progress.title')}
              </h2>
            </div>

            {/* Progress Steps */}
            <div className="steps steps-vertical lg:steps-horizontal w-full mb-12">
              <div className="step step-primary">
                <div className="text-center lg:text-left ml-4 lg:ml-0">
                  <div className="font-semibold text-primary mb-2">✅ {t('progress.milestoneLabels.betaSpellbook')}</div>
                  <p className="text-sm text-base-content/70">{t('progress.milestone1')}</p>
                </div>
              </div>
              <div className="step">
                <div className="text-center lg:text-left ml-4 lg:ml-0">
                  <div className="font-semibold text-base-content/50 mb-2">🔄 {t('progress.milestoneLabels.feedbackCauldron')}</div>
                  <p className="text-sm text-base-content/50">{t('progress.milestone2')}</p>
                </div>
              </div>
              <div className="step">
                <div className="text-center lg:text-left ml-4 lg:ml-0">
                  <div className="font-semibold text-base-content/50 mb-2">🚀 {t('progress.milestoneLabels.globalPortal')}</div>
                  <p className="text-sm text-base-content/50">{t('progress.milestone3')}</p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <Link 
                href="/contactUs?category=general"
                className="btn btn-accent btn-lg"
              >
                {t('progress.feedbackButton')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-16 bg-warning/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="alert alert-warning shadow-lg">
              <div className="flex items-center gap-4">
                <div className="text-2xl">📰</div>
                <div>
                  <h3 className="font-bold text-lg">{t('news.title')}</h3>
                  <p className="text-sm">{t('news.breaking')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-8 md:p-12">
                <h2 className="card-title text-3xl font-bold justify-center mb-6 text-primary">
                  {t('investors.title')}
                </h2>
                <p className="text-lg text-base-content/80 mb-8 leading-relaxed">
                  {t('investors.description')}
                </p>
                <div className="card-actions justify-center">
                  <Link 
                    href="/contactUs?category=business_partnership"
                    className="btn btn-primary btn-lg"
                  >
                    {tModal('investors.button')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};

export default AboutUsPage;
