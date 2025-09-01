import { NextIntlClientProvider } from 'next-intl';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { headers } from 'next/headers';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { routing, isValidLocale, Locale } from '@/i18n/routing';
import React from 'react';

// Message loading (mirrors logic used in root not-found for consistency)
type Messages = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function loadMessages(locale: string): Promise<Messages> {
  try {
    const messagesDir = path.join(process.cwd(), 'src', 'messages', locale);
    const files = await readdir(messagesDir);
    const messages: Messages = {};
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(messagesDir, file);
      try {
        const content = await readFile(filePath, 'utf8');
        const json: unknown = JSON.parse(content);
        const namespace = file.replace('.json', '');
        if (isRecord(json)) {
          if (!Object.prototype.hasOwnProperty.call(json, namespace)) {
            messages[namespace] = json;
          } else {
            Object.assign(messages, json);
          }
        }
      } catch (e) {
        console.error('[Offline] Failed to parse messages file', file, e);
      }
    }
    if (Object.keys(messages).length === 0) return await loadFallbackMessages();
    return messages;
  } catch (e) {
    console.error('[Offline] Failed to load messages for locale', locale, e);
    return await loadFallbackMessages();
  }
}

async function loadFallbackMessages(): Promise<Messages> {
  try {
    const fallbackDir = path.join(process.cwd(), 'src', 'messages', 'en-US');
    const files = await readdir(fallbackDir);
    const messages: Messages = {};
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await readFile(path.join(fallbackDir, file), 'utf8');
        const json: unknown = JSON.parse(content);
        const namespace = file.replace('.json', '');
        if (isRecord(json)) {
          if (!Object.prototype.hasOwnProperty.call(json, namespace)) {
            messages[namespace] = json;
          } else {
            Object.assign(messages, json);
          }
        }
      } catch (e) {
        console.error('[Offline] Failed to parse fallback file', file, e);
      }
    }
    if (Object.keys(messages).length > 0) return messages;
  } catch (e) {
    console.error('[Offline] Fallback load error', e);
  }
  return {};
}

function getLocaleFromCookie(cookieHeader: string | null): Locale | undefined {
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(';');
  const localeCookie = cookies.find(c => c.trim().startsWith('NEXT_LOCALE='));
  if (localeCookie) {
    const locale = localeCookie.split('=')[1];
    if (isValidLocale(locale)) return locale;
  }
  return undefined;
}

function negotiateLocale(acceptLanguage: string | null, cookieLocale?: Locale): Locale {
  if (cookieLocale) return cookieLocale;
  if (!acceptLanguage) return routing.defaultLocale;
  const parts = acceptLanguage.split(',').map(s => s.trim());
  for (const part of parts) {
    const [tag] = part.split(';');
    if (isValidLocale(tag)) return tag as Locale;
    const match = routing.locales.find(l => l.toLowerCase().startsWith(tag.toLowerCase() + '-')) as Locale | undefined;
    if (match) return match;
  }
  return routing.defaultLocale;
}

// Client portion separated for interactivity and network status detection
const OfflineClient: React.FC = () => {
  'use client';
  const { useTranslations } = require('next-intl');
  const t = useTranslations('Offline');
  const [online, setOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : false);
  const [redirecting, setRedirecting] = React.useState(false);

  React.useEffect(() => {
    function handleOnline() {
      setOnline(true);
      setRedirecting(true);
      // Give the SW a short time to warm the network before redirect
      setTimeout(() => {
        window.location.replace('/');
      }, 1200);
    }
    function handleOffline() { setOnline(false); setRedirecting(false);}    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto text-center py-16 px-4">
      <h1 className="text-4xl font-bold text-base-content mb-4">{t('title')}</h1>
      <p className="text-base-content/70 mb-6 leading-relaxed">{t('description')}</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">{t('tipsTitle')}</h2>
        <ul className="list-disc list-inside text-left text-sm space-y-1">
          <li>{t('tips.readCached')}</li>
          <li>{t('tips.reuseNav')}</li>
          <li>{t('tips.wait')}</li>
        </ul>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button onClick={() => window.history.back()} className="btn btn-primary">
          {t('actions.goBack')}
        </button>
        <button onClick={() => window.location.reload()} className="btn btn-outline">
          {t('actions.retry')}
        </button>
        <a href="/" className="btn btn-ghost">{t('actions.goHome')}</a>
      </div>
      <div className="mt-8 text-sm opacity-70" role="status" aria-live="polite">
        {redirecting ? t('status.backOnline') : (online ? t('status.backOnline') : t('status.stillOffline'))}
      </div>
    </div>
  );
};

export default async function OfflinePage() {
  const hdrs = await headers();
  const acceptLanguage = hdrs.get('accept-language');
  const cookieHeader = hdrs.get('cookie');
  const cookieLocale = getLocaleFromCookie(cookieHeader);
  const locale: Locale = negotiateLocale(acceptLanguage, cookieLocale);
  const messages = await loadMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex flex-col min-h-screen bg-base-100">
        <Header />
        <main className="flex-grow">
          <OfflineClient />
        </main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
