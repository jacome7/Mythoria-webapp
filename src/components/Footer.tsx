'use client';

import Link from 'next/link';
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa';
import { useTranslations } from 'next-intl';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const t = useTranslations('common.Footer');
  return (
    <footer className="bg-base-200 text-base-content p-6">
      <div className="container mx-auto">
        {/* Main footer content with left and right sections */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8">
          <div className="mb-6 md:mb-0">
            <div className="max-w-sm">
              <p className="text-xs text-left mb-2">
                {t('aboutFounder')}
              </p>
              <Link href="/aboutUs" className="link link-hover text-xs underline text-primary">{t('readMyStory')}</Link>
            </div>
          </div>

          {/* Right section - Social icons and links */}
          <div className="w-full md:w-auto flex flex-col items-center md:items-end">
            {/* Social icons */}
            <div className="mb-4">
              <div className="flex gap-4 justify-center md:justify-end">
                <a href="https://www.facebook.com/MythoriaOfficial" target="_blank" rel="noopener noreferrer" className="link link-hover">
                  <FaFacebook size={24} />
                </a>
                <a href="https://www.instagram.com/mythoria_oficial" target="_blank" rel="noopener noreferrer" className="link link-hover">
                  <FaInstagram size={24} />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="link link-hover">
                  <FaLinkedin size={24} />
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="link link-hover">
                  <FaTiktok size={24} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="link link-hover">
                  <FaYoutube size={24} />
                </a>
              </div>
            </div>
              {/* Links */}
            <div className="flex flex-col items-center md:items-end gap-2">
              <Link href="/contactUs" className="link link-hover text-sm underline text-primary">{t('contactUs')}</Link>
            </div>
          </div>
        </div>
        
        {/* Copyright at the bottom */}
        <div className="border-t border-base-300 pt-4 text-center text-xs">
          <p className="text-xs">&copy; {currentYear} {t('copyright')} | <Link href="/privacy-policy" className="link link-hover">{t('privacyPolicy')}</Link> | <Link href="/termsAndConditions" className="link link-hover">{t('termsConditions')}</Link></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
