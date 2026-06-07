'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import styles from './Footer.module.css';

const socialLinks = [
  {
    href: 'https://www.facebook.com/MythoriaOfficial',
    label: 'Mythoria on Facebook',
    icon: '/homepage/kids_fantasy/facebook_icon.webp',
    width: 160,
    height: 159,
  },
  {
    href: 'https://www.instagram.com/mythoria_books/',
    label: 'Mythoria on Instagram',
    icon: '/homepage/kids_fantasy/instagram_icon.webp',
    width: 160,
    height: 157,
  },
  {
    href: 'https://linkedin.com/company/mythoria',
    label: 'Mythoria on LinkedIn',
    icon: '/homepage/kids_fantasy/linkedin_icon.webp',
    width: 160,
    height: 155,
  },
  {
    href: 'https://youtube.com',
    label: 'Mythoria on YouTube',
    icon: '/homepage/kids_fantasy/youtube_icon.webp',
    width: 160,
    height: 150,
  },
] as const;

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const tCommonFooter = useTranslations('Footer');
  const locale = useLocale();

  return (
    <footer className={styles.footer}>
      <Image
        src="/homepage/kids_fantasy/footer.webp"
        alt=""
        width={1920}
        height={373}
        sizes="100vw"
        className={styles.backdrop}
        aria-hidden="true"
      />
      <div className={styles.content}>
        <div className={styles.socialRow}>
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label={social.label}
              title={social.label}
            >
              <Image
                src={social.icon}
                alt=""
                width={social.width}
                height={social.height}
                sizes="52px"
                className={styles.socialIcon}
              />
            </a>
          ))}
        </div>

        <nav className={styles.primaryNav} aria-label="Footer">
          <Link href={`/${locale}/pricing`} className={styles.primaryLink}>
            {tCommonFooter('pricingServices')}
          </Link>
          <span className={styles.separator} aria-hidden="true">
            |
          </span>
          <Link href={`/${locale}/aboutUs`} className={styles.primaryLink}>
            {tCommonFooter('aboutUs')}
          </Link>
          <span className={styles.separator} aria-hidden="true">
            |
          </span>
          <Link href={`/${locale}/contactUs`} className={styles.primaryLink}>
            {tCommonFooter('contactUs')}
          </Link>
        </nav>

        <div className={styles.divider} aria-hidden="true">
          <span />
        </div>

        <div className={styles.legal}>
          <span>
            &copy; {currentYear} {tCommonFooter('copyright')}
          </span>
          <span className={styles.legalSeparator} aria-hidden="true">
            |
          </span>
          <Link href={`/${locale}/privacy-policy`} className={styles.legalLink}>
            {tCommonFooter('privacyPolicy')}
          </Link>
          <span className={styles.legalSeparator} aria-hidden="true">
            |
          </span>
          <Link href={`/${locale}/termsAndConditions`} className={styles.legalLink}>
            {tCommonFooter('termsConditions')}
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
