'use client'; // Required for useTranslations

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

const AboutUsPage = () => {
  const t = useTranslations('AboutUs');

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="grid md:grid-cols-2 gap-12 items-center mb-12 md:mb-16">
        <div className="md:pr-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-base-content leading-tight">
            {t('title')}
          </h1>
        </div>
        <div>
          <Image 
            src="/AboutUs.jpg"
            alt={t('imageAlt')}
            width={500} 
            height={500}
            className="rounded-lg shadow-2xl object-cover w-full h-auto md:max-h-[500px]"
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6 text-lg text-base-content leading-relaxed">
        <p>
          {t('paragraphs.p1')}
        </p>
        <p>
          {t('paragraphs.p2')}
        </p>
        <p>
          {t('paragraphs.p3')}
        </p>
        <p className="font-semibold text-base-content">
          {t('paragraphs.p4')}
        </p>
        <p className="text-2xl font-bold text-center text-primary mt-10">
          {t('paragraphs.tagline')}
        </p>
      </div>
    </div>
  );
};

export default AboutUsPage;
