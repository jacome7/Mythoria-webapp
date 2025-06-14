'use client';

import { useEffect } from 'react';

interface LanguageAttributeProps {
  locale: string;
}

export default function LanguageAttribute({ locale }: LanguageAttributeProps) {
  useEffect(() => {
    // Set the lang attribute on the html element
    document.documentElement.setAttribute('lang', locale);
  }, [locale]);

  return null;
}
