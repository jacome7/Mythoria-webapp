'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import MyStoriesTable from '@/components/MyStoriesTable';
import MyCharactersTable from '@/components/MyCharactersTable';
import CreditsDisplay from '@/components/CreditsDisplay';

export default function MyStoriesPage() {
  const t = useTranslations('MyStoriesPage'); const [authorName, setAuthorName] = useState<string>('Storyteller');
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
          setAuthorName(authorData.displayName || 'Storyteller');
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
  }, []);

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
          <h1 className="text-4xl font-bold">Welcome</h1>
          <p className="text-lg text-gray-600">
            You need to be signed in to view your stories.
          </p>
          <div className="space-x-4">
            <Link href="/sign-in" className="btn btn-primary">
              Sign In
            </Link>
            <Link href="/sign-up" className="btn btn-outline">
              Create Account
            </Link>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        {/* Header Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold">
              {t('title')}, {authorName}!
            </h1>
            <div className="flex items-center gap-4">
              <CreditsDisplay credits={credits} />
              <Link href="/tell-your-story/step-1" className="btn btn-primary">
                <FiPlus className="w-5 h-5 mr-2" />
                {t('writeNewStory')}
              </Link>
            </div>
          </div>

          {/* Tabs and Content Wrapper */}
          <div>
            {/* Tabs */}
            <div className="tabs">
              <a
                className={`tab tab-lifted py-3 w-52 text-center ${activeTab === 'stories' ? 'tab-active !bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'}`}
                onClick={() => setActiveTab('stories')}
              >
                {t('tabs.myStories') || 'My Stories'}
              </a>
              <a
                className={`tab tab-lifted py-3 w-52 text-center ${activeTab === 'characters' ? 'tab-active !bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'}`}
                onClick={() => setActiveTab('characters')}
              >
                {t('tabs.myCharacters') || 'My Characters'}
              </a>
            </div>

            {/* Tab Content */}
            <div className="border border-base-300 rounded-b-md p-6 bg-base-100 shadow">
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