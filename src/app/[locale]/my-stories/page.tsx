'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import MyStoriesTable from '@/components/MyStoriesTable';
import MyCharactersTable from '@/components/MyCharactersTable';
import CreditsDisplay from '@/components/CreditsDisplay';

export default function MyStoriesPage() {
  const t = useTranslations('MyStoriesPage');
  const locale = useLocale();
  const [authorName, setAuthorName] = useState<string>(t('defaults.authorName'));
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stories' | 'characters'>('stories');
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch author data
        const authorResponse = await fetch('/api/auth/me');
        if (authorResponse.ok) {
          const authorData = await authorResponse.json();
          setAuthorName(authorData.displayName || t('defaults.authorName'));
        }

        // Fetch credits
        const creditsResponse = await fetch('/api/my-credits');
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          setCredits(creditsData.currentBalance || 0);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [t]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-96">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SignedOut>
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">{t('signedOut.welcome')}</h1>
          <p className="text-lg text-gray-600">
            {t('signedOut.needSignIn')}
          </p>
          <div className="space-x-4">
            <Link href={`/${locale}/sign-in`} className="btn btn-primary">
              {t('signedOut.signIn')}
            </Link>
            <Link href={`/${locale}/sign-up`} className="btn btn-outline">
              {t('signedOut.createAccount')}
            </Link>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        {/* Header Section */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
            <h1 className="text-4xl font-bold">
              {t('title')}, {authorName}!
            </h1>
            <div className="flex flex-row items-center gap-2 md:gap-4">
              <CreditsDisplay credits={credits} />
              <Link href="/tell-your-story/step-1" className="btn btn-primary">
                <FiPlus className="w-5 h-5 mr-2" />
                {t('writeNewStory')}
              </Link>
            </div>
          </div>
          {/* Tabs and Content Wrapper */}
          <div className="-mx-4 md:mx-0">
            {/* Tabs */}
            <div className="tabs">
              <a
                className={`tab tab-lifted py-1 flex-1 text-center ${activeTab === 'stories' ? 'tab-active !bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'}`}
                onClick={() => setActiveTab('stories')}
              >
                {t('tabs.myStories')}
              </a>
              <a
                className={`tab tab-lifted py-1 flex-1 text-center ${activeTab === 'characters' ? 'tab-active !bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'}`}
                onClick={() => setActiveTab('characters')}
              >
                {t('tabs.myCharacters')}
              </a>
            </div>

            {/* Tab Content */}
            <div className="border border-base-300 rounded-b-md p-2 md:p-6 bg-base-100 shadow">
              {activeTab === 'stories' ? (
                <MyStoriesTable />
              ) : (
                <MyCharactersTable />
              )}
            </div>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}