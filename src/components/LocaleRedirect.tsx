'use client';

import { useEffect } from 'react';
import { routing } from '@/i18n/routing';

const LocaleRedirect = () => {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if current URL already has a locale
    const pathname = window.location.pathname;
    const hasLocale = routing.locales.some(locale => 
      pathname.startsWith(`/${locale}`)
    );

    // If URL already has a locale, don't redirect
    if (hasLocale) return;

    // Function to determine the best locale
    const getPreferredLocale = (): string => {
      // 1. Check localStorage for saved preference
      const savedLocale = localStorage.getItem('mythoria-locale');
      if (savedLocale && routing.locales.includes(savedLocale as (typeof routing.locales)[number])) {
        return savedLocale;
      }

      // 2. Check browser language with partial matching
      if (navigator.language) {
        const browserLang = navigator.language.toLowerCase();
        
        // First try exact match
        const exactMatch = routing.locales.find(locale => 
          locale.toLowerCase() === browserLang
        );
        if (exactMatch) return exactMatch;

        // Then try partial match (e.g., 'pt' -> 'pt-PT')
        const partialMatch = routing.locales.find(locale => {
          const localePrefix = locale.split('-')[0].toLowerCase();
          const browserPrefix = browserLang.split('-')[0];
          return localePrefix === browserPrefix;
        });
        if (partialMatch) return partialMatch;
      }

      // 3. Fallback to default locale
      return routing.defaultLocale;
    };

    const preferredLocale = getPreferredLocale();
    
    // Redirect to the preferred locale
    const newUrl = `/${preferredLocale}${pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(newUrl);
  }, []);

  return null;
};

export default LocaleRedirect;
