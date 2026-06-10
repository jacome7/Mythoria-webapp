'use client';

import { useEffect, useState } from 'react';
import { Show } from '@clerk/nextjs';
import { Link } from '@/i18n/routing';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import MyStoriesTable from '@/components/MyStoriesTable';
import CreditsDisplay from '@/components/CreditsDisplay';

export default function MyStoriesPage() {
  const tMyStoriesPage = useTranslations('MyStoriesPage');
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
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
    <div className="container mx-auto px-2 py-8 sm:px-4">
      <Show when="signed-out">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">{tMyStoriesPage('signedOut.welcome')}</h1>
          <p className="text-lg text-gray-600">{tMyStoriesPage('signedOut.needSignIn')}</p>
          <div className="space-x-4">
            <Link href="/sign-in" className="btn btn-primary">
              {tMyStoriesPage('signedOut.signIn')}
            </Link>
            <Link href="/sign-up" className="btn btn-outline">
              {tMyStoriesPage('signedOut.createAccount')}
            </Link>
          </div>
        </div>
      </Show>
      <Show when="signed-in">
        <div className="space-y-4">
          <div className="px-1 md:px-0">
            <div className="grid grid-cols-2 items-center gap-3 sm:flex sm:justify-end sm:gap-4">
              <CreditsDisplay
                credits={credits}
                className="btn-sm min-h-9 whitespace-nowrap px-3 text-xs sm:btn-md sm:px-5 sm:text-sm"
              />
              <Link
                href="/tell-your-story/step-1"
                className="btn btn-primary btn-sm min-h-9 whitespace-nowrap px-3 text-xs sm:btn-md sm:px-5 sm:text-sm"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                {tMyStoriesPage('writeNewStory')}
              </Link>
            </div>
          </div>
          <MyStoriesTable />
        </div>
      </Show>
    </div>
  );
}
