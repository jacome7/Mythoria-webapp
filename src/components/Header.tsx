'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserButton, useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { useLocale } from 'next-intl';

const Header = () => {
  const t = useTranslations('Header');
  const { isLoaded, isSignedIn } = useUser();
  const [isClient, setIsClient] = useState(false);
  const locale = useLocale();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration mismatch by not rendering auth-dependent content until client-side
  if (!isClient || !isLoaded) {
    return (
      <header className="navbar bg-base-100 shadow-md">
        <div className="navbar-start">
          <div className="dropdown">
            <label tabIndex={0} className="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </label>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li><Link href="/">{t('navigation.homepage')}</Link></li>
            <li><Link href="/get-inspired">{t('navigation.getInspired')}</Link></li>
            <li><Link href="/tell-your-story/step-1">{t('navigation.tellYourStory')}</Link></li>
            <li><Link href="/pricing">{t('navigation.pricing')}</Link></li>
          </ul>
          </div>
          <Link href="/" className="btn btn-ghost normal-case text-xl px-1 py-0.5">
            <Image src="/Mythoria-logo-lanscape-transparent.png" alt={t('logoAlt')} width={120} height={45} />
          </Link>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li><Link href="/">{t('navigation.homepage')}</Link></li>
            <li><Link href="/get-inspired">{t('navigation.getInspired')}</Link></li>
            <li><Link href="/tell-your-story/step-1">{t('navigation.tellYourStory')}</Link></li>
            <li><Link href="/pricing">{t('navigation.pricing')}</Link></li>
          </ul>
        </div>
        <div className="navbar-end">
          <div className="mr-4">
            <LanguageSwitcher />
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
      </header>
    );
  }
  return (
    <header className="navbar bg-base-100 shadow-md">
      <div className="navbar-start">
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </label>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li><Link href="/">{t('navigation.homepage')}</Link></li>
            <li><Link href="/get-inspired">{t('navigation.getInspired')}</Link></li>
            <li><Link href="/tell-your-story/step-1">{t('navigation.tellYourStory')}</Link></li>
            <li><Link href="/pricing">{t('navigation.pricing')}</Link></li>
            {isSignedIn && (
              <li><Link href="/my-stories">{t('navigation.myStories')}</Link></li>
            )}
          </ul>
        </div>
        <Link href="/" className="btn btn-ghost normal-case text-xl px-1 py-0.5">
          <Image src="/Mythoria-logo-lanscape-transparent.png" alt={t('logoAlt')} width={120} height={45} />
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><Link href="/">{t('navigation.homepage')}</Link></li>
          <li><Link href="/get-inspired">{t('navigation.getInspired')}</Link></li>
          <li><Link href="/tell-your-story/step-1">{t('navigation.tellYourStory')}</Link></li>
          <li><Link href="/pricing">{t('navigation.pricing')}</Link></li>
          {isSignedIn && (
            <li><Link href="/my-stories">{t('navigation.myStories')}</Link></li>
          )}
        </ul>
      </div>

      <div className="navbar-end">
        <div className="mr-4">
          <LanguageSwitcher />
        </div>
        {!isSignedIn ? (
          <div className="flex gap-2">
            <Link href={`/${locale}/sign-in`} className="btn btn-primary">
              {t('auth.signIn')}
            </Link>
          </div>
        ) : (
          <UserButton />
        )}
      </div>
    </header>
  );
};

export default Header;
