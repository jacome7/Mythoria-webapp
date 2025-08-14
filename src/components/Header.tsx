'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserButton, useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { useLocale } from 'next-intl';

const Header = () => {
  const tCommonHeader = useTranslations('Header');
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
            <li><Link href="/" className="text-base py-3" onClick={() => (document.activeElement as HTMLElement)?.blur()}>{tCommonHeader('navigation.homepage')}</Link></li>
            <li><Link href="/get-inspired" className="text-base py-3" onClick={() => (document.activeElement as HTMLElement)?.blur()}>{tCommonHeader('navigation.getInspired')}</Link></li>
            <li><Link href="/tell-your-story/step-1" className="text-base py-3" onClick={() => (document.activeElement as HTMLElement)?.blur()}>{tCommonHeader('navigation.tellYourStory')}</Link></li>
            <li><Link href="/blog" className="text-base py-3" onClick={() => (document.activeElement as HTMLElement)?.blur()}>{tCommonHeader('navigation.blog')}</Link></li>
            <li><Link href="/pricing" className="text-base py-3" onClick={() => (document.activeElement as HTMLElement)?.blur()}>{tCommonHeader('navigation.pricing')}</Link></li>
          </ul>
          </div>
          <div className="flex items-center">
            <Link href="/" className="btn btn-ghost normal-case text-xl px-1 py-0.5">
              <Image src="/images/logo/just_lettering.png" alt={tCommonHeader('logoAlt')} width={150} height={49} />
            </Link>
            <div className="ml-1 sm:ml-2">
              <span className="badge badge-outline badge-primary badge-xs sm:badge-sm font-semibold" style={{ fontSize: '11px' }}>
                BETA
              </span>
            </div>
          </div>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li><Link href="/">{tCommonHeader('navigation.homepage')}</Link></li>
            <li><Link href="/get-inspired">{tCommonHeader('navigation.getInspired')}</Link></li>
            <li><Link href="/tell-your-story/step-1">{tCommonHeader('navigation.tellYourStory')}</Link></li>
            <li><Link href="/pricing">{tCommonHeader('navigation.pricing')}</Link></li>
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
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-1 shadow bg-base-100 rounded-box w-52">
            <li><Link href="/" className="text-base py-3" onClick={() => (document.activeElement as HTMLElement)?.blur()}>{tCommonHeader('navigation.homepage')}</Link></li>
            <li><Link href="/get-inspired" className="text-base py-3" onClick={() => (document.activeElement as HTMLElement)?.blur()}>{tCommonHeader('navigation.getInspired')}</Link></li>
            <li><Link href="/tell-your-story/step-1" className="text-base py-3" onClick={() => (document.activeElement as HTMLElement)?.blur()}>{tCommonHeader('navigation.tellYourStory')}</Link></li>
            <li><Link href="/blog" className="text-base py-3" onClick={() => (document.activeElement as HTMLElement)?.blur()}>{tCommonHeader('navigation.blog')}</Link></li>
            <li><Link href="/pricing" className="text-base py-3" onClick={() => (document.activeElement as HTMLElement)?.blur()}>{tCommonHeader('navigation.pricing')}</Link></li>
            {isSignedIn && (
              <li><Link href="/my-stories" className="text-base py-3" onClick={() => (document.activeElement as HTMLElement)?.blur()}>{tCommonHeader('navigation.myStories')}</Link></li>
            )}
          </ul>
        </div>
        <div className="flex items-center">
          <Link href="/" className="btn btn-ghost normal-case text-xl px-0 py-0.5">
            <Image src="/images/logo/just_lettering.png" alt={tCommonHeader('logoAlt')} width={140} height={45} />
          </Link>
          <div className="ml-1 sm:ml-2">
            <span className="badge badge-outline badge-primary badge-xs sm:badge-sm font-semibold" style={{ fontSize: '11px' }}>
              BETA
            </span>
          </div>
        </div>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><Link href="/">{tCommonHeader('navigation.homepage')}</Link></li>
          <li><Link href="/get-inspired">{tCommonHeader('navigation.getInspired')}</Link></li>
          <li><Link href="/tell-your-story/step-1">{tCommonHeader('navigation.tellYourStory')}</Link></li>
          <li><Link href="/blog">{tCommonHeader('navigation.blog')}</Link></li>
          <li><Link href="/pricing">{tCommonHeader('navigation.pricing')}</Link></li>
          {isSignedIn && (
            <li><Link href="/my-stories">{tCommonHeader('navigation.myStories')}</Link></li>
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
              {tCommonHeader('auth.signIn')}
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
