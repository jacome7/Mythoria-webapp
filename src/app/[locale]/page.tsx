'use client'; // Required for TypeAnimation

import Image from "next/image";
import Link from "next/link";
import { TypeAnimation } from 'react-type-animation';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { SignedOut } from '@clerk/nextjs';
import StoryCounter from "@/components/StoryCounter";
import QuoteOfTheDay from "@/components/QuoteOfTheDay";
import AnimatedLogo from "@/components/AnimatedLogo";

export default function Home() {
  const t = useTranslations('HomePage');
  
  // Note: Carousel removed in favor of a vertical mobile layout

  // Get the words array from translations with proper error handling
  const wordsRaw = t.raw('words');
  
  // Memoize the words array to prevent dependency changes
  const words = useMemo(() => {
    return Array.isArray(wordsRaw) ? wordsRaw : [];
  }, [wordsRaw]);

  // Create sequence for TypeAnimation - memoized to prevent hydration issues
  const sequence = useMemo(() => {
    const seq: (string | number)[] = [];
    // Add safety check
    if (Array.isArray(words) && words.length > 0) {
      words.forEach(word => {
        seq.push(word, 1500);
      });
    } else {
      // Fallback words if translation is missing
      const fallbackWords = t.raw('fallbackWords') || ['Adventure', 'Love Story', 'Mystery', 'Fairy Tale'];
      fallbackWords.forEach((word: string) => {
        seq.push(word, 1500);
      });
    }
    return seq;
  }, [words, t]);

  // Carousel logic removed

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="container mx-auto px-4 py-4">
        <header className="hero min-h-[40vh] bg-base-200 rounded-box my-4">
          <div className="hero-content flex-col lg:flex-row w-full">
            <div className="lg:w-1/2 text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl font-bold">
                ✨ {t('hero.writeYourOwn')}<br/>
                <TypeAnimation
                  sequence={sequence}
                  wrapper="span"
                  speed={5}
                  className="text-primary"
                  repeat={Infinity}
                />
              </h1>
              <p className="py-3 text-lg">
                {t('hero.subtitle').split(t('hero.subtitleEmphasized')).map((part, index, array) => (
                  <span key={index}>
                    {index === array.length - 1 ? part : (
                      <>
                        {part}
                        <em>{t('hero.subtitleEmphasized')}</em>
                      </>
                    )}
                  </span>
                ))}
              </p>
              <Link href="/tell-your-story" className="btn btn-primary btn-lg">
                {t('hero.tellYourOwnStory')}
              </Link>
            </div>
            {/* Right Side: Logo */}
            <div className="lg:w-1/2 flex justify-center lg:justify-end mt-4 lg:mt-0">
              <AnimatedLogo />
            </div>
          </div>
        </header>

        {/* Quote of the Day Section */}
        <section className="my-8">
          <QuoteOfTheDay />
        </section>
            
            {/* Audience Sections */}
            <section className="my-16">
              {/* Desktop Grid */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Link href="/p/mateus-e-o-leo" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
                  <figure className="px-10 pt-10">
                    <Image src="/SampleBooks/Mateus_e_o_leao.jpg" alt={t('altTexts.kidsBook')} width={300} height={300} className="rounded-xl" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-2xl">{t('audiences.kids.title')}</h2>
                    <p>{t('audiences.kids.description')}</p>
                  </div>
                </Link>

                <Link href="/p/juventude-de-gaia-no-mundial-de-clubes" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
                  <figure className="px-10 pt-10">
                    <Image src="/SampleBooks/juventude_gaia.jpg" alt={t('altTexts.groupsYearbooks')} width={300} height={300} className="rounded-xl" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-2xl">{t('audiences.groups.title')}</h2>
                    <p>{t('audiences.groups.description')}</p>
                  </div>
                </Link>

                <Link href="/p/how-i-met-your-mother" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
                  <figure className="px-10 pt-10">
                    <Image src="/SampleBooks/How_I_met_your_mother.jpg" alt={t('altTexts.adultBook')} width={300} height={300} className="rounded-xl" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-2xl">{t('audiences.adults.title')}</h2>
                    <p>{t('audiences.adults.description')}</p>
                  </div>
                </Link>

                <div className="card bg-base-100 shadow-xl">
                  <figure className="px-10 pt-10">
                    <Image src="/SampleBooks/CaravanConcierge.jpg" alt={t('altTexts.companyBook')} width={300} height={300} className="rounded-xl" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-2xl">{t('audiences.companies.title')}</h2>
                    <p>{t('audiences.companies.description')}</p>
                  </div>
                </div>
              </div>
              
              {/* Mobile Vertical List */}
              <div className="md:hidden space-y-6">
                <Link href="/p/mateus-e-o-leo" className="card bg-base-100 shadow-xl w-full mx-2 hover:shadow-2xl transition-shadow cursor-pointer">
                  <figure className="p-4">
                    <Image src="/SampleBooks/Mateus_e_o_leao.jpg" alt={t('altTexts.kidsBook')} width={1200} height={1200} className="w-full h-auto rounded-xl" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-xl">{t('audiences.kids.title')}</h2>
                    <p className="text-sm">{t('audiences.kids.description')}</p>
                  </div>
                </Link>

                <Link href="/p/juventude-de-gaia-no-mundial-de-clubes" className="card bg-base-100 shadow-xl w-full mx-2 hover:shadow-2xl transition-shadow cursor-pointer">
                  <figure className="p-4">
                    <Image src="/SampleBooks/juventude_gaia.jpg" alt={t('altTexts.groupsYearbooks')} width={1200} height={1200} className="w-full h-auto rounded-xl" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-xl">{t('audiences.groups.title')}</h2>
                    <p className="text-sm">{t('audiences.groups.description')}</p>
                  </div>
                </Link>

                <Link href="/p/how-i-met-your-mother" className="card bg-base-100 shadow-xl w-full mx-2 hover:shadow-2xl transition-shadow cursor-pointer">
                  <figure className="p-4">
                    <Image src="/SampleBooks/How_I_met_your_mother.jpg" alt={t('altTexts.adultBook')} width={1200} height={1200} className="w-full h-auto rounded-xl" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-xl">{t('audiences.adults.title')}</h2>
                    <p className="text-sm">{t('audiences.adults.description')}</p>
                  </div>
                </Link>

                <div className="card bg-base-100 shadow-xl w-full mx-2">
                  <figure className="p-4">
                    <Image src="/SampleBooks/CaravanConcierge.jpg" alt={t('altTexts.companyBook')} width={1200} height={1200} className="w-full h-auto rounded-xl" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h2 className="card-title text-xl">{t('audiences.companies.title')}</h2>
                    <p className="text-sm">{t('audiences.companies.description')}</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="divider my-16"></div>
            {/* How It Works Section */}
            <section className="my-16">
              <h2 className="text-3xl font-bold text-center mb-10">{t('howItWorks.title')}</h2>
              <ul className="timeline timeline-snap-icon max-md:timeline-compact timeline-vertical">
                <li>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="timeline-start md:text-end mb-10">
                    <time className="font-mono italic">{t('howItWorks.stepLabels.step1')}</time>
                    <div className="text-lg font-black">{t('howItWorks.steps.step1.title')}</div>
                    {t('howItWorks.steps.step1.description')}
                  </div>
                  <hr/>
                </li>
                <li>
                  <hr/>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="timeline-end mb-10">
                    <time className="font-mono italic">{t('howItWorks.stepLabels.step2')}</time>
                    <div className="text-lg font-black">{t('howItWorks.steps.step2.title')}</div>
                    {t('howItWorks.steps.step2.description')}
                  </div>
                  <hr/>
                </li>
                <li>
                  <hr/>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="timeline-start md:text-end mb-10">
                    <time className="font-mono italic">{t('howItWorks.stepLabels.step3')}</time>
                    <div className="text-lg font-black">{t('howItWorks.steps.step3.title')}</div>
                    {t('howItWorks.steps.step3.description')}
                  </div>
                  <hr/>
                </li>
                <li>
                  <hr/>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="timeline-end mb-10">
                    <time className="font-mono italic">{t('howItWorks.stepLabels.step4')}</time>
                    <div className="text-lg font-black">{t('howItWorks.steps.step4.title')}</div>
                    {t('howItWorks.steps.step4.description')}
                  </div>
                  <hr/>
                </li>
                <li>
                  <hr/>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="timeline-start md:text-end mb-10">
                    <time className="font-mono italic">{t('howItWorks.stepLabels.step5')}</time>
                    <div className="text-lg font-black">{t('howItWorks.steps.step5.title')}</div>
                    {t('howItWorks.steps.step5.description')}
                  </div>
                  <hr/>
                </li>
                <li>
                  <hr/>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="timeline-end mb-10">
                    <time className="font-mono italic">{t('howItWorks.stepLabels.step6')}</time>
                    <div className="text-lg font-black">{t('howItWorks.steps.step6.title')}</div>
                    {t('howItWorks.steps.step6.description')}
                  </div>
                </li>
              </ul>              <p className="text-center mt-8 text-lg">
                {t('howItWorks.conclusion')}
              </p>
            </section>
            {/* Story Counter Section */}
            <section className="my-16 text-center">
              <h2 className="text-3xl font-bold mb-4">{t('community.title')}</h2>
              <StoryCounter />
            </section>

            {/* Call to Action Section - Only show if user is not signed in */}
            <SignedOut>
              <section className="my-16">
                <div className="bg-gray-100 rounded-lg shadow-lg p-8 text-center">
                  <h3 className="font-bold text-xl mb-4">{t('cta.title')}</h3>
                  <div className="text-base mb-6">{t('cta.subtitle')}</div>
                  <Link href="/sign-up" className="btn btn-outline btn-primary btn-lg">
                    {t('cta.button')}
                  </Link>
                </div>
              </section>
            </SignedOut>
      </div>
    </div>
  );
}
