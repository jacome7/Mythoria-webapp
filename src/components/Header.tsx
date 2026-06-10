'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserButton, useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { useLocale } from 'next-intl';
import { BookOpen, Feather, Users, WalletCards } from 'lucide-react';
import styles from './Header.module.css';
import { homepageAsset } from '@/constants/homepageAssets';

const dropdownMenuClassName = `dropdown-content ${styles.dropdownMenu}`;
const mobileMenuClassName = `dropdown dropdown-bottom ${styles.mobileMenu}`;

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
      <header className={styles.header}>
        <div className={styles.headerStart}>
          <div className={mobileMenuClassName}>
            <label tabIndex={0} className={styles.mobileMenuButton}>
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
                  className={styles.mobileMenuLink}
                  onClick={() => (document.activeElement as HTMLElement)?.blur()}
                >
                  {tCommonHeader('navigation.homepage')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/get-inspired`}
                  className={styles.mobileMenuLink}
                  onClick={() => (document.activeElement as HTMLElement)?.blur()}
                >
                  {tCommonHeader('navigation.getInspired')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/tell-your-story/step-1`}
                  className={styles.mobileMenuLink}
                  onClick={() => (document.activeElement as HTMLElement)?.blur()}
                >
                  {tCommonHeader('navigation.tellYourStory')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/blog`}
                  className={styles.mobileMenuLink}
                  onClick={() => (document.activeElement as HTMLElement)?.blur()}
                >
                  {tCommonHeader('navigation.blog')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/pricing`}
                  className={styles.mobileMenuLink}
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
              className={styles.logoLink}
              aria-label={tCommonHeader('navigation.homepage')}
              title={tCommonHeader('navigation.homepage')}
            >
              <Image
                src="/images/logo/just_lettering.png"
                alt={tCommonHeader('logoAlt')}
                width={150}
                height={49}
                className={styles.logoImage}
              />
            </Link>
          </div>
        </div>
        <nav className={styles.headerCenter} aria-label="Main">
          <ul className={styles.desktopMenu}>
            <li>
              <Link href={`/${locale}`} className={styles.desktopMenuLink}>
                {tCommonHeader('navigation.homepage')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/get-inspired`} className={styles.desktopMenuLink}>
                {tCommonHeader('navigation.getInspired')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/tell-your-story/step-1`} className={styles.desktopMenuLink}>
                {tCommonHeader('navigation.tellYourStory')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/pricing`} className={styles.desktopMenuLink}>
                {tCommonHeader('navigation.pricing')}
              </Link>
            </li>
          </ul>
        </nav>
        <div className={styles.headerEnd}>
          <div className={styles.languageSlot}>
            <LanguageSwitcher />
          </div>
          <div className={styles.authSlot}>
            <div className={`${styles.authSkeleton} animate-pulse`} />
          </div>
        </div>
      </header>
    );
  }
  return (
    <header className={styles.header}>
      <div className={styles.headerStart}>
        <div className={mobileMenuClassName}>
          <label tabIndex={0} className={styles.mobileMenuButton}>
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
                className={styles.mobileMenuLink}
                onClick={() => (document.activeElement as HTMLElement)?.blur()}
              >
                {tCommonHeader('navigation.homepage')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/get-inspired`}
                className={styles.mobileMenuLink}
                onClick={() => (document.activeElement as HTMLElement)?.blur()}
              >
                {tCommonHeader('navigation.getInspired')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/tell-your-story/step-1`}
                className={styles.mobileMenuLink}
                onClick={() => (document.activeElement as HTMLElement)?.blur()}
              >
                {tCommonHeader('navigation.tellYourStory')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/blog`}
                className={styles.mobileMenuLink}
                onClick={() => (document.activeElement as HTMLElement)?.blur()}
              >
                {tCommonHeader('navigation.blog')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/pricing`}
                className={styles.mobileMenuLink}
                onClick={() => (document.activeElement as HTMLElement)?.blur()}
              >
                {tCommonHeader('navigation.pricing')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/partners`}
                className={styles.mobileMenuLink}
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
            className={styles.logoLink}
            aria-label={tCommonHeader('navigation.homepage')}
            title={tCommonHeader('navigation.homepage')}
          >
            <Image
              src="/images/logo/just_lettering.png"
              alt={tCommonHeader('logoAlt')}
              width={140}
              height={45}
              className={styles.logoImage}
            />
          </Link>
        </div>
      </div>
      <nav className={styles.headerCenter} aria-label="Main">
        <ul className={styles.desktopMenu}>
          <li>
            <Link href={`/${locale}`} className={styles.desktopMenuLink}>
              {tCommonHeader('navigation.homepage')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/get-inspired`} className={styles.desktopMenuLink}>
              {tCommonHeader('navigation.getInspired')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/tell-your-story/step-1`} className={styles.desktopMenuLink}>
              {tCommonHeader('navigation.tellYourStory')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/blog`} className={styles.desktopMenuLink}>
              {tCommonHeader('navigation.blog')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/pricing`} className={styles.desktopMenuLink}>
              {tCommonHeader('navigation.pricing')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/partners`} className={styles.desktopMenuLink}>
              {tCommonHeader('navigation.partners')}
            </Link>
          </li>
        </ul>
      </nav>

      <div className={styles.headerEnd}>
        <div className={styles.languageSlot}>
          <LanguageSwitcher />
        </div>
        {!isSignedIn ? (
          <div className={styles.authSlot}>
            <Link href={`/${locale}/sign-in`} className={styles.signInButton}>
              <Image
                src={homepageAsset('button.webp')}
                alt=""
                fill
                sizes="(max-width: 389px) 110px, (max-width: 639px) 125px, 152px"
                className={styles.signInButtonImage}
                aria-hidden="true"
              />
              <span className={styles.signInButtonText}>{tCommonHeader('auth.signIn')}</span>
            </Link>
          </div>
        ) : (
          <UserButton userProfileUrl={`/${locale}/profile`} userProfileMode="navigation">
            <UserButton.MenuItems>
              <UserButton.Link
                label={tCommonHeader('navigation.myStories')}
                href={`/${locale}/my-stories`}
                labelIcon={<BookOpen className="w-4 h-4" />}
              />
              <UserButton.Link
                label={tCommonHeader('navigation.myCharacters')}
                href={`/${locale}/my-characters`}
                labelIcon={<Users className="w-4 h-4" />}
              />
              <UserButton.Link
                label={tCommonHeader('navigation.myPersonas')}
                href={`/${locale}/my-personas`}
                labelIcon={<Feather className="w-4 h-4" />}
              />
              <UserButton.Link
                label={tCommonHeader('navigation.creditsAndPayments')}
                href={`/${locale}/credits-and-payments`}
                labelIcon={<WalletCards className="w-4 h-4" />}
              />
              <UserButton.Action label="manageAccount" />
              <UserButton.Action label="signOut" />
            </UserButton.MenuItems>
          </UserButton>
        )}
      </div>
    </header>
  );
};

export default Header;
