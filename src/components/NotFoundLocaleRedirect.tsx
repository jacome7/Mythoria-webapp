"use client";

import { useEffect } from 'react';
import { routing, isValidLocale, Locale } from '@/i18n/routing';

interface Props {
  pathname: string;
}

// Redirects root-level 404 paths (without locale prefix) to the preferred locale using localStorage.
export default function NotFoundLocaleRedirect({ pathname }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  const hasLocale = segments.length > 0 && isValidLocale(first);
    if (hasLocale) return; // Already localized 404 or path

  const stored = localStorage.getItem('mythoria-locale');
  const preferred: Locale = stored && isValidLocale(stored) ? stored : routing.defaultLocale;
    // Avoid redirect loop if already at root
    const target = `/${preferred}${pathname.startsWith('/') ? pathname : '/' + pathname}`;
    if (window.location.pathname !== target) {
      window.location.replace(target);
    }
  }, [pathname]);

  return null;
}
