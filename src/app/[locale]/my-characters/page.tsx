'use client';

import { Show } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import MyCharactersTable from '@/components/MyCharactersTable';

export default function MyCharactersPage() {
  const tMyCharactersPage = useTranslations('MyCharactersPage');

  return (
    <div className="container mx-auto px-2 py-8 sm:px-4">
      <Show when="signed-out">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">{tMyCharactersPage('signedOut.welcome')}</h1>
          <p className="text-lg text-gray-600">{tMyCharactersPage('signedOut.needSignIn')}</p>
          <div className="space-x-4">
            <Link href="/sign-in" className="btn btn-primary">
              {tMyCharactersPage('signedOut.signIn')}
            </Link>
            <Link href="/sign-up" className="btn btn-outline">
              {tMyCharactersPage('signedOut.createAccount')}
            </Link>
          </div>
        </div>
      </Show>
      <Show when="signed-in">
        <MyCharactersTable />
      </Show>
    </div>
  );
}
