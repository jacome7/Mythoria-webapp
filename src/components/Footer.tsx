'use client';

import Link from 'next/link';
import { FaFacebook, FaInstagram, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { useLocale, useTranslations } from 'next-intl';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const tCommonFooter = useTranslations('Footer');
  const locale = useLocale();
  return (
    <footer className="bg-base-200 text-base-content p-6">
      <div className="container mx-auto">
        {/* Main footer content - centered */}
        <div className="flex flex-col items-center mb-8">
          {/* Social icons and links */}
          <div className="w-full flex flex-col items-center">
            {/* Social icons */}
            <div className="mb-4">
              <div className="flex gap-4 justify-center">
                <a
                  href="https://www.facebook.com/MythoriaOfficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-hover"
                  aria-label="Mythoria on Facebook"
                  title="Mythoria on Facebook"
                >
                  <FaFacebook size={24} />
                </a>
                <a
                  href="https://www.instagram.com/mythoria_books/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-hover"
                  aria-label="Mythoria on Instagram"
                  title="Mythoria on Instagram"
                >
                  <FaInstagram size={24} />
                </a>
                <a
                  href="https://linkedin.com/company/mythoria"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-hover"
                  aria-label="Mythoria on LinkedIn"
                  title="Mythoria on LinkedIn"
                >
                  <FaLinkedin size={24} />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-hover"
                  aria-label="Mythoria on YouTube"
                  title="Mythoria on YouTube"
                >
                  <FaYoutube size={24} />
                </a>
                {/*}
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="link link-hover">
                  <FaTiktok size={24} />
                </a>
                */}
              </div>
            </div>
            {/* Links */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Link
                  href={`/${locale}/pricing`}
                  className="link link-hover underline text-primary"
                >
                  {tCommonFooter('pricingServices')}
                </Link>
                <span>|</span>
                <Link
                  href={`/${locale}/aboutUs`}
                  className="link link-hover underline text-primary"
                >
                  {tCommonFooter('aboutUs')}
                </Link>
                <span>|</span>
                <Link
                  href={`/${locale}/contactUs`}
                  className="link link-hover underline text-primary"
                >
                  {tCommonFooter('contactUs')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright at the bottom */}
        <div className="border-t border-base-300 pt-4 text-center text-xs">
          <p className="text-xs">
            &copy; {currentYear} {tCommonFooter('copyright')} |{' '}
            <Link href={`/${locale}/privacy-policy`} className="link link-hover">
              {tCommonFooter('privacyPolicy')}
            </Link>{' '}
            |{' '}
            <Link href={`/${locale}/termsAndConditions`} className="link link-hover">
              {tCommonFooter('termsConditions')}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
