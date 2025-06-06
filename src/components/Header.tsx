'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@auth0/nextjs-auth0';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
  const t = useTranslations('Header');
  const { user, isLoading } = useUser();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration mismatch by not rendering auth-dependent content until client-side
  if (!isClient || isLoading) {
    return (
      <header className="navbar bg-base-100 shadow-md">
        <div className="navbar-start">
          <div className="dropdown">
            <label tabIndex={0} className="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </label>          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li><Link href="/">{t('navigation.homepage')}</Link></li>
            <li><Link href="/get-inspired">{t('navigation.getInspired')}</Link></li>
            <li><Link href="/tell-your-story/step-1">{t('navigation.tellYourStory')}</Link></li>          <li><Link href="/pricing">{t('navigation.pricing')}</Link></li>
          </ul>
          </div>
          <Link href="/" className="btn btn-ghost normal-case text-xl px-1 py-0.5">
            <Image src="/Mythoria-logo-white-transparent-256x168.png" alt={t('logoAlt')} width={60} height={39} />
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
            <li><Link href="/tell-your-story/step-1">{t('navigation.tellYourStory')}</Link></li>            <li><Link href="/pricing">{t('navigation.pricing')}</Link></li>
            {user && (
              <li><Link href="/my-stories">{t('navigation.myStories')}</Link></li>
            )}        </ul>
        </div>
        <Link href="/" className="btn btn-ghost normal-case text-xl px-1 py-0.5">
          <Image src="/Mythoria-logo-white-transparent-256x168.png" alt={t('logoAlt')} width={60} height={39} />
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><Link href="/">{t('navigation.homepage')}</Link></li>
          <li><Link href="/get-inspired">{t('navigation.getInspired')}</Link></li>
          <li><Link href="/tell-your-story/step-1">{t('navigation.tellYourStory')}</Link></li>
          <li><Link href="/pricing">{t('navigation.pricing')}</Link></li>          {user && (
            <li><Link href="/my-stories">{t('navigation.myStories')}</Link></li>
          )}
        </ul>
      </div>

      <div className="navbar-end">
        <div className="mr-4">
          <LanguageSwitcher />
        </div>
        {!user ? (
          <div className="flex gap-2">
            <a href="/api/auth/login" className="btn btn-primary">
              {t('auth.signIn')}
            </a>
          </div>
        ) : (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full">
                <img src={user.picture || '/default-avatar.png'} alt={user.name || 'User'} />
              </div>
            </label>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li><span className="font-semibold">{user.name || user.email}</span></li>
              <li><a href="/api/auth/logout">{t('auth.signOut')}</a></li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
