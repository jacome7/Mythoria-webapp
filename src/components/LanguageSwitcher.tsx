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
      default:
        return locale.toUpperCase();
    }
  };

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
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
              <span>{availableLocale === 'en-US' ? 'English' : 'Português'}</span>
              <span className="text-xs opacity-60">{getLanguageLabel(availableLocale)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LanguageSwitcher;