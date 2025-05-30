'use client';

import Link from 'next/link';
import Image from 'next/image';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
  const t = useTranslations('Header');

  return (
    <header className="navbar bg-base-100 shadow-md">
      <div className="navbar-start">
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </label>          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li><Link href="/">{t('navigation.homepage')}</Link></li>
            <li><Link href="/get-inspired">{t('navigation.getInspired')}</Link></li>
            <li><Link href="/tell-your-story/step-1">{t('navigation.tellYourStory')}</Link></li>
            <li><Link href="/pricing">{t('navigation.pricing')}</Link></li>
            <SignedIn>
              <li><Link href="/my-stories">{t('navigation.myStories')}</Link></li>
              <li><Link href="/dashboard">{t('navigation.dashboard')}</Link></li>
            </SignedIn>
            <li className="border-t pt-2 mt-2">
              <div className="flex items-center justify-center">
                <LanguageSwitcher />
              </div>
            </li>
          </ul>
        </div>
          <Link href="/" className="btn btn-ghost normal-case text-xl px-2 py-1">
          <Image src="/Mythoria-logo-white-transparent-256x168.png" alt={t('logoAlt')} width={52} height={34} />
        </Link>
      </div>      <div className="navbar-center hidden lg:flex">        <ul className="menu menu-horizontal px-1">
          <li><Link href="/">{t('navigation.homepage')}</Link></li>
          <li><Link href="/get-inspired">{t('navigation.getInspired')}</Link></li>
          <li><Link href="/tell-your-story/step-1">{t('navigation.tellYourStory')}</Link></li>
          <li><Link href="/pricing">{t('navigation.pricing')}</Link></li>
          <SignedIn>
            <li><Link href="/my-stories">{t('navigation.myStories')}</Link></li>
          </SignedIn>
        </ul>
      </div>

      <div className="navbar-end">
        <div className="mr-4">
          <LanguageSwitcher />
        </div>
        <SignedOut>
          <div className="flex gap-2">
            <Link href="/sign-in" className="btn btn-primary">
              {t('auth.signIn')}
            </Link>
          </div>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
};

export default Header;
