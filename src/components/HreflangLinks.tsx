'use client';

import { useHreflangLinks } from '@/lib/hreflang-client';
import Head from 'next/head';

interface HreflangLinksProps {
  locale: string;
  customPath?: string;
}

/**
 * Client component to add hreflang links to pages that need custom handling
 * Use this for dynamic pages where the layout's metadata isn't sufficient
 */
export default function HreflangLinks({ customPath }: HreflangLinksProps) {
  const hreflangLinks = useHreflangLinks();
  
  return (
    <Head>
      {hreflangLinks.map((link) => (
        <link
          key={link.hreflang}
          rel="alternate"
          hrefLang={link.hreflang}
          href={customPath ? link.href.replace(/\/[^/]*$/, customPath) : link.href}
        />
      ))}
    </Head>
  );
}
