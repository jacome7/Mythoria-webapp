'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { routing } from '@/i18n/routing';

const LanguageSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const handleLanguageChange = (newLocale: string) => {
    // Remove the current locale from the pathname
    const segments = pathname.split('/');
    if (routing.locales.includes(segments[1] as (typeof routing.locales)[number])) {
      segments[1] = newLocale;
    } else {
      segments.unshift('', newLocale);
    }
    
    const newPath = segments.join('/');
    router.push(newPath);
  };

  const getLanguageLabel = (locale: string) => {
    switch (locale) {
      case 'en-US':
        return 'EN';
      case 'pt-PT':
        return 'PT';
      case 'es-ES':
        return 'ES';
      default:
        return locale.toUpperCase();
    }
  };

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span className="hidden sm:inline ml-1">{getLanguageLabel(locale)}</span>
      </label>
      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
        {routing.locales.map((availableLocale) => (
          <li key={availableLocale}>
            <button
              onClick={() => handleLanguageChange(availableLocale)}
              className={`flex items-center justify-between ${
                locale === availableLocale ? 'active' : ''
              }`}
            >
              <span>
                {availableLocale === 'en-US' ? 'English' : 
                 availableLocale === 'pt-PT' ? 'Português' : 
                 availableLocale === 'es-ES' ? 'Español' : 
                 availableLocale}
              </span>
              <span className="text-xs opacity-60">{getLanguageLabel(availableLocale)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LanguageSwitcher;