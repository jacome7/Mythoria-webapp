'use client'; // Required for useTranslations

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const AboutUsPage = () => {  const t = useTranslations('AboutUs');
  const tModal = useTranslations('AboutUsModal');
  const [ageHover, setAgeHover] = useState(false);

  return (
    <>      {/* 0. Simple Header */}
      <div className="py-20 bg-base-100">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-base-content mb-6">
              {t('hero.title')}
            </h1>
            <p className="text-lg md:text-xl text-base-content/80 mb-8 max-w-3xl mx-auto leading-relaxed">
              {t('hero.subtitle')}
            </p>
            <Link href="/tell-your-story/step-1" className="btn btn-primary btn-lg">
              {t('hero.cta')}
            </Link>
          </div>
        </div>
      </div>

      {/* 1. "The Young Founder" Section */}
      <div className="py-20 bg-base-100">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="order-2 md:order-1 flex justify-center">
              <div className="relative">
                <div className="w-80 h-80 rounded-full overflow-hidden border-8 border-primary shadow-2xl relative">
                  <Image 
                    src="/AboutUs.jpg"
                    alt={t('founder.imageAlt')}
                    width={400}
                    height={400}
                    className="object-cover w-full h-full"
                  />
                  {/* Decorative sword overlay */}
                  <div className="absolute bottom-4 right-4 text-4xl opacity-80">⚔️</div>
                </div>
                {/* Age badge */}
                <div 
                  className="absolute -top-4 -right-4 bg-secondary text-secondary-content px-4 py-2 rounded-full font-bold text-sm cursor-pointer hover:bg-accent transition-colors shadow-lg"
                  onMouseEnter={() => setAgeHover(true)}
                  onMouseLeave={() => setAgeHover(false)}
                >
                  {ageHover ? t('founder.ageHover') : t('founder.ageLabel')}
                </div>
              </div>
            </div>
            
            <div className="order-1 md:order-2">
              <h2 className="text-4xl md:text-5xl font-bold text-base-content mb-8 flex items-center gap-3">
                {t('founder.title')} <span className="text-3xl">🧑‍💻</span>
              </h2>
              <p className="text-lg text-base-content leading-relaxed">
                {t('founder.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. "Meet the Oompa-Loompas 2.0" Grid */}
      <div className="py-20 bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-base-content mb-6">
              {t('aiTeam.title')}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
            {/* Quill-Bot Card */}
            <div className="card bg-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className="card-body text-center p-8">
                <div className="text-6xl mb-4">✍️</div>
                <h3 className="card-title justify-center text-xl mb-3 text-primary">
                  {t('aiTeam.quillBot.name')}
                </h3>
                <p className="text-base-content/80 text-sm leading-relaxed">
                  {t('aiTeam.quillBot.description')}
                </p>
              </div>
            </div>

            {/* Brush-Bot Card */}
            <div className="card bg-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className="card-body text-center p-8">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="card-title justify-center text-xl mb-3 text-primary">
                  {t('aiTeam.brushBot.name')}
                </h3>
                <p className="text-base-content/80 text-sm leading-relaxed">
                  {t('aiTeam.brushBot.description')}
                </p>
              </div>
            </div>

            {/* Voice-Bot Card */}
            <div className="card bg-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className="card-body text-center p-8">
                <div className="text-6xl mb-4">🎙️</div>
                <h3 className="card-title justify-center text-xl mb-3 text-primary">
                  {t('aiTeam.voiceBot.name')}
                </h3>
                <p className="text-base-content/80 text-sm leading-relaxed">
                  {t('aiTeam.voiceBot.description')}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-base-content/70 italic max-w-2xl mx-auto">
              {t('aiTeam.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* 3. "Work-in-Progress Lab" */}
      <div className="py-20 bg-base-200">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-base-content mb-8 flex items-center justify-center gap-3">
              {t('progress.title')} <span className="text-4xl">🔬</span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">            {/* Progress Steps */}
            <ul className="steps steps-vertical lg:steps-horizontal w-full mb-12">
              <li className="step step-primary">
                <div className="text-left lg:text-center">
                  <div className="font-semibold text-primary mb-2">✅ Beta Spellbook</div>
                  <p className="text-sm text-base-content/70">{t('progress.milestone1')}</p>
                </div>
              </li>
              <li className="step">
                <div className="text-left lg:text-center">
                  <div className="font-semibold text-base-content/50 mb-2">🔄 Feedback Cauldron</div>
                  <p className="text-sm text-base-content/50">{t('progress.milestone2')}</p>
                </div>
              </li>
              <li className="step">
                <div className="text-left lg:text-center">
                  <div className="font-semibold text-base-content/50 mb-2">🚀 Global Portal</div>
                  <p className="text-sm text-base-content/50">{t('progress.milestone3')}</p>
                </div>
              </li>
            </ul>            {/* Feedback Button */}
            <div className="text-center">
              <Link 
                href="/contactUs?category=general"
                className="btn btn-accent btn-lg rounded-full shadow-lg hover:scale-105 transition-transform"
              >
                {t('progress.feedbackButton')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. "News From the Realm" */}
      <div className="py-16 bg-gradient-to-r from-amber-100 to-orange-100">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="card bg-white shadow-xl border-l-8 border-warning">
              <div className="card-body">
                <div className="flex items-center gap-4">
                  <div className="text-3xl animate-pulse">📰</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-warning mb-2">{t('news.title')}</h3>
                    <p className="text-base-content animate-type">
                      {t('news.breaking')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. "Investors: Join the Quest" */}
      <div className="py-20 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="card bg-gradient-to-br from-amber-100 to-yellow-100 shadow-2xl border-4 border-amber-300 relative">
              {/* Wax seal */}
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg">
                  🔱
                </div>
              </div>
              
              <div className="card-body p-12 pt-16">
                <h2 className="text-3xl font-bold text-amber-800 mb-6">
                  {t('investors.title')}
                </h2>
                <p className="text-lg text-amber-700 mb-8 leading-relaxed">
                  {t('investors.description')}
                </p>                <Link 
                  href="/contactUs?category=business_partnership"
                  className="btn btn-warning btn-lg rounded-full shadow-lg hover:scale-105 transition-transform"
                >
                  {tModal('investors.button')}
                </Link>
              </div>
            </div>
          </div>        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes type {
          from { width: 0 }
          to { width: 100% }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 4s ease-in-out infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-type {
          overflow: hidden;
          white-space: nowrap;
          animation: type 3s steps(60, end);
        }
      `}</style>
    </>
  );
};

export default AboutUsPage;
