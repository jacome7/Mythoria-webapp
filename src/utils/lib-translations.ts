import { routing, type Locale } from '@/i18n/routing';
import { headers } from 'next/headers';

/**
 * Automatically detect locale from request headers when not provided
 */
async function getRequestLocale(): Promise<string> {
  try {
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language') || '';
    const detectedLocale = acceptLanguage.split(',')[0]?.split('-').slice(0, 2).join('-') || routing.defaultLocale;
    
    return routing.locales.includes(detectedLocale as Locale) ? detectedLocale : routing.defaultLocale;
  } catch {
    // If headers are not available (non-request context), use default
    return routing.defaultLocale;
  }
}

/**
 * Server-side translation utility for library functions
 * This should be used in library functions that run on the server side
 */
export async function getLibTranslations(locale?: string) {
  const validLocale = locale || await getRequestLocale();

  try {
    const messages = await import(`@/messages/${validLocale}/lib.json`);
    
    return {
      locale: validLocale,
      t: (key: string, params?: Record<string, string | number>) => {
        const keys = key.split('.');
        let value: unknown = messages.default.lib;
        
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = (value as Record<string, unknown>)[k];
          } else {
            return key; // Return key if path doesn't exist
          }
        }
        
        if (typeof value !== 'string') return key;
        
        // Handle parameter substitution
        if (params) {
          return Object.entries(params).reduce((text, [param, val]) => {
            return text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(val));
          }, value);
        }
        
        return value;
      }
    };
  } catch (error) {
    console.error(`Failed to load translations for locale ${validLocale}:`, error);
    // Fallback to a basic function that returns the key
    return {
      locale: validLocale,
      t: (key: string) => key
    };
  }
}

/**
 * Client-side translation utility for library functions
 * This is a wrapper that can be used when translations are already available
 */
export function createLibTranslations(t: (key: string, params?: Record<string, string | number>) => string) {
  return {
    t: (key: string, params?: Record<string, string | number>) => {
      return t(`lib.${key}`, params);
    }
  };
}
