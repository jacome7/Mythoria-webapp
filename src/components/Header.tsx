'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserButton, useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { useLocale } from 'next-intl';
import { MdAccountBalanceWallet } from 'react-icons/md';

const headerClassName =
  'navbar h-12 !min-h-12 border-b border-base-content/10 bg-base-100/60 px-2 py-0 shadow-sm backdrop-blur-xl sm:px-4';
const mobileMenuButtonClassName = 'btn btn-ghost btn-sm h-9 min-h-9 w-9 p-0 lg:hidden';
const dropdownMenuClassName =
  'menu menu-sm dropdown-content z-50 mt-2 w-52 rounded-box border border-base-content/10 bg-base-100/90 p-1 shadow-xl backdrop-blur-xl';
const mobileMenuLinkClassName = 'py-2.5 text-base';
const desktopMenuLinkClassName = 'py-2 text-xs xl:text-sm';
const logoLinkClassName = 'btn btn-ghost h-9 min-h-9 normal-case px-0 py-0 text-xl';
const logoImageClassName = 'h-auto w-[128px] sm:w-[140px]';

const Header = () => {
  const tCommonHeader = useTranslations('Header');
  const { isLoaded, isSignedIn } = useUser();
  const [isClient, setIsClient] = useState(false);
  const locale = useLocale();

  // This effect is necessary to prevent hydration mismatches with Clerk's auth state
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration mismatch by not rendering auth-dependent content until client-side
  if (!isClient || !isLoaded) {
    return (
      <header className={headerClassName}>
        <div className="navbar-start">
          <div className="dropdown">
            <label tabIndex={0} className={mobileMenuButtonClassName}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            </label>
            <ul tabIndex={0} className={dropdownMenuClassName}>
              <li>
                <Link
                  href={`/${locale}`}
                  className={mobileMenuLinkClassName}
                  onClick={() => (document.activeElement as HTMLElement)?.blur()}
                >
                  {tCommonHeader('navigation.homepage')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/get-inspired`}
                  className={mobileMenuLinkClassName}
                  onClick={() => (document.activeElement as HTMLElement)?.blur()}
                >
                  {tCommonHeader('navigation.getInspired')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/tell-your-story/step-1`}
                  className={mobileMenuLinkClassName}
                  onClick={() => (document.activeElement as HTMLElement)?.blur()}
                >
                  {tCommonHeader('navigation.tellYourStory')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/blog`}
                  className={mobileMenuLinkClassName}
                  onClick={() => (document.activeElement as HTMLElement)?.blur()}
                >
                  {tCommonHeader('navigation.blog')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/pricing`}
                  className={mobileMenuLinkClassName}
                  onClick={() => (document.activeElement as HTMLElement)?.blur()}
                >
                  {tCommonHeader('navigation.pricing')}
                </Link>
              </li>
            </ul>
          </div>
          <div className="flex items-center">
            <Link
              href={`/${locale}`}
              className={logoLinkClassName}
              aria-label={tCommonHeader('navigation.homepage')}
              title={tCommonHeader('navigation.homepage')}
            >
              <Image
                src="/images/logo/just_lettering.png"
                alt={tCommonHeader('logoAlt')}
                width={150}
                height={49}
                className={logoImageClassName}
              />
            </Link>
          </div>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li>
              <Link href={`/${locale}`} className={desktopMenuLinkClassName}>
                {tCommonHeader('navigation.homepage')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/get-inspired`} className={desktopMenuLinkClassName}>
                {tCommonHeader('navigation.getInspired')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/tell-your-story/step-1`} className={desktopMenuLinkClassName}>
                {tCommonHeader('navigation.tellYourStory')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/pricing`} className={desktopMenuLinkClassName}>
                {tCommonHeader('navigation.pricing')}
              </Link>
            </li>
          </ul>
        </div>
        <div className="navbar-end">
          <div className="mr-2 sm:mr-4">
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
    <header className={headerClassName}>
      <div className="navbar-start">
        <div className="dropdown">
          <label tabIndex={0} className={mobileMenuButtonClassName}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </label>
          <ul tabIndex={0} className={dropdownMenuClassName}>
            <li>
              <Link
                href={`/${locale}`}
                className={mobileMenuLinkClassName}
                onClick={() => (document.activeElement as HTMLElement)?.blur()}
              >
                {tCommonHeader('navigation.homepage')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/get-inspired`}
                className={mobileMenuLinkClassName}
                onClick={() => (document.activeElement as HTMLElement)?.blur()}
              >
                {tCommonHeader('navigation.getInspired')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/tell-your-story/step-1`}
                className={mobileMenuLinkClassName}
                onClick={() => (document.activeElement as HTMLElement)?.blur()}
              >
                {tCommonHeader('navigation.tellYourStory')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/blog`}
                className={mobileMenuLinkClassName}
                onClick={() => (document.activeElement as HTMLElement)?.blur()}
              >
                {tCommonHeader('navigation.blog')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/pricing`}
                className={mobileMenuLinkClassName}
                onClick={() => (document.activeElement as HTMLElement)?.blur()}
              >
                {tCommonHeader('navigation.pricing')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/partners`}
                className={mobileMenuLinkClassName}
                onClick={() => (document.activeElement as HTMLElement)?.blur()}
              >
                {tCommonHeader('navigation.partners')}
              </Link>
            </li>
          </ul>
        </div>
        <div className="flex items-center">
          <Link
            href={`/${locale}`}
            className={logoLinkClassName}
            aria-label={tCommonHeader('navigation.homepage')}
            title={tCommonHeader('navigation.homepage')}
          >
            <Image
              src="/images/logo/just_lettering.png"
              alt={tCommonHeader('logoAlt')}
              width={140}
              height={45}
              className={logoImageClassName}
            />
          </Link>
        </div>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link href={`/${locale}`} className={desktopMenuLinkClassName}>
              {tCommonHeader('navigation.homepage')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/get-inspired`} className={desktopMenuLinkClassName}>
              {tCommonHeader('navigation.getInspired')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/tell-your-story/step-1`} className={desktopMenuLinkClassName}>
              {tCommonHeader('navigation.tellYourStory')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/blog`} className={desktopMenuLinkClassName}>
              {tCommonHeader('navigation.blog')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/pricing`} className={desktopMenuLinkClassName}>
              {tCommonHeader('navigation.pricing')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/partners`} className={desktopMenuLinkClassName}>
              {tCommonHeader('navigation.partners')}
            </Link>
          </li>
        </ul>
      </div>

      <div className="navbar-end">
        <div className="mr-2 sm:mr-4">
          <LanguageSwitcher />
        </div>
        {!isSignedIn ? (
          <div className="flex gap-2">
            <Link href={`/${locale}/sign-in`} className="btn btn-primary btn-sm h-9 min-h-9">
              {tCommonHeader('auth.signIn')}
            </Link>
          </div>
        ) : (
          <UserButton userProfileUrl={`/${locale}/profile`} userProfileMode="navigation">
            <UserButton.MenuItems>
              <UserButton.Link
                label={tCommonHeader('navigation.myStories')}
                href={`/${locale}/my-stories`}
                labelIcon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <path d="M4 4h12a2 2 0 0 1 2 2v14l-5-3-5 3V6a2 2 0 0 0-2-2z" />
                  </svg>
                }
              />
              <UserButton.Link
                label={tCommonHeader('navigation.creditsAndPayments')}
                href={`/${locale}/credits-and-payments`}
                labelIcon={<MdAccountBalanceWallet className="w-4 h-4" />}
              />
            </UserButton.MenuItems>
          </UserButton>
        )}
      </div>
    </header>
  );
};

export default Header;
