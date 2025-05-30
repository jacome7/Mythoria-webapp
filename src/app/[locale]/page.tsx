'use client'; // Required for TypeAnimation

import Image from "next/image";
import Link from "next/link";
import { TypeAnimation } from 'react-type-animation';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import StoryCounter from "@/components/StoryCounter";
import QuoteOfTheDay from "@/components/QuoteOfTheDay";
import EmailSignup from "@/components/EmailSignup";

export default function Home() {
  const t = useTranslations('HomePage');
  
  // Get the words array from translations
  const words = t.raw('words') as string[];

  // Create sequence for TypeAnimation - memoized to prevent hydration issues
  const sequence = useMemo(() => {
    const seq: (string | number)[] = [];
    words.forEach(word => {
      seq.push(word, 1500);
    });
    return seq;
  }, [words]);

  const showSoonPage = process.env.NEXT_PUBLIC_SHOW_SOON_PAGE === 'true';

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="container mx-auto px-4 py-8">
        <header className="hero min-h-[60vh] bg-base-200 rounded-box my-12">
          <div className="hero-content flex-col lg:flex-row w-full">
            <div className="lg:w-1/2 text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl font-bold">
                ✨ {t('hero.writeYourOwn')}<br/>
                <TypeAnimation
                  sequence={sequence}
                  wrapper="span"
                  speed={10}
                  className="text-primary"
                  repeat={Infinity}
                />
                &nbsp;✨
              </h1>
              <p className="py-6 text-lg">
                {t('hero.subtitle')}
              </p>{/*}
              <Link href="/create" className="btn btn-primary btn-lg">
                {t('hero.tryItNow')}
              </Link>*/}
            </div>
            {/* Right Side: Logo */}
            <div className="lg:w-1/2 flex justify-center lg:justify-end mt-8 lg:mt-0">
              <Image 
                src="/Logo_black_512x444.png" 
                alt="Mythoria Logo" 
                width={390}
                height={338}
                className="rounded-lg"
              />
            </div>
          </div>
        </header>

        {/* Quote of the Day Section */}
        <section className="my-16">
          <QuoteOfTheDay />
        </section>        {showSoonPage ? (
          <section className="my-16 text-center">
            <h2 className="text-3xl font-bold mb-4">{t('comingSoon.title')}</h2>            
            <p className="text-xl text-gray-600 mb-12">
              {t('comingSoon.subtitle')}
            </p>
            
            {/* Email Signup Component */}
            <div className="max-w-md mx-auto">
              <EmailSignup />
            </div>
          </section>
        ) : (
          <>
            {/* Audience Sections */}
            <section className="my-16 grid md:grid-cols-3 gap-8">
              <div className="card bg-base-200 shadow-xl">
                <figure className="px-10 pt-10">
                  <Image src="/SampleBooks/A_bea_tem_um_macaco_no_nariz.jpg" alt="Kids Book" width={300} height={200} className="rounded-xl" />
                </figure>
                <div className="card-body items-center text-center">
                  <h2 className="card-title text-2xl">{t('audiences.kids.title')}</h2>
                  <p>{t('audiences.kids.description')}</p>
                  <div className="card-actions">
                    <Link href="/create?audience=kids" className="btn btn-primary mt-4">{t('audiences.kids.button')}</Link>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 shadow-xl">
                <figure className="px-10 pt-10">
                  <Image src="/SampleBooks/How_I_met_your_mother.jpg" alt="How I met your mother" width={300} height={300} className="rounded-xl" />
                </figure>                <div className="card-body items-center text-center">
                  <h2 className="card-title text-2xl">{t('audiences.adults.title')}</h2>
                  <p>{t('audiences.adults.description')}</p>
                  <div className="card-actions">
                    <Link href="/create?audience=adults" className="btn btn-accent mt-4">{t('audiences.adults.button')}</Link>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 shadow-xl">
                <figure className="px-10 pt-10">
                  <Image src="/SampleBooks/CentralCasa.jpg" alt="Company Book" width={300} height={200} className="rounded-xl" />
                </figure>
                <div className="card-body items-center text-center">
                  <h2 className="card-title text-2xl">{t('audiences.companies.title')}</h2>
                  <p>{t('audiences.companies.description')}</p>
                  <div className="card-actions">
                    <Link href="/contact?reason=company" className="btn btn-info mt-4">{t('audiences.companies.button')}</Link>
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
                    <time className="font-mono italic">Step 1</time>
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
                    <time className="font-mono italic">Step 2</time>
                    <div className="text-lg font-black">{t('howItWorks.steps.step2.title')}</div>
                    {t('howItWorks.steps.step2.description')}
                  </div>
                  <hr/>
                </li>
                <li>
                  <hr/>
                  <div className="timeline-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                  </div>                  <div className="timeline-start md:text-end mb-10">
                    <time className="font-mono italic">Step 3</time>
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
                    <time className="font-mono italic">Step 4</time>                    <div className="text-lg font-black">{t('howItWorks.steps.step4.title')}</div>
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
                    <time className="font-mono italic">Step 5</time>                    <div className="text-lg font-black">{t('howItWorks.steps.step5.title')}</div>
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
                    <time className="font-mono italic">Step 6</time>
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
          </>
        )}
      </div>
    </div>
  );
}
