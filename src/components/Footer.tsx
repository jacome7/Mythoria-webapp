'use client';

import Link from 'next/link';
import { FaFacebook, FaInstagram, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { useTranslations } from 'next-intl';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const tCommonFooter = useTranslations('Footer');
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
                >
                  <FaFacebook size={24} />
                </a>
                <a
                  href="https://www.instagram.com/mythoria_books/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-hover"
                >
                  <FaInstagram size={24} />
                </a>
                <a
                  href="https://linkedin.com/company/mythoria"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-hover"
                >
                  <FaLinkedin size={24} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="link link-hover">
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
                <Link href="/pricing" className="link link-hover underline text-primary">
                  {tCommonFooter('pricingServices')}
                </Link>
                <span>|</span>
                <Link href="/aboutUs" className="link link-hover underline text-primary">
                  {tCommonFooter('aboutUs')}
                </Link>
                <span>|</span>
                <Link href="/contactUs" className="link link-hover underline text-primary">
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
            <Link href="/privacy-policy" className="link link-hover">
              {tCommonFooter('privacyPolicy')}
            </Link>{' '}
            |{' '}
            <Link href="/termsAndConditions" className="link link-hover">
              {tCommonFooter('termsConditions')}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
