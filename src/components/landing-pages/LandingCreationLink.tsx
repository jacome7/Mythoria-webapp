'use client';

import { Suspense, useEffect, useState, type ComponentProps } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  buildAuthEntryPath,
  buildLandingCreationReturnPath,
  extractLandingSlug,
} from '@/lib/auth-return';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
  onlyOnLanding?: boolean;
};

export default function LandingCreationLink(props: Props) {
  const { href, onlyOnLanding: _onlyOnLanding, ...linkProps } = props;
  // Custom destinations (pricing, contact, examples) retain normal link behavior.
  if (!/^\/[a-z]{2}-[A-Z]{2}\/tell-your-story(?:\/step-1)?\/?(?:[?#]|$)/.test(href)) {
    return <Link {...linkProps} href={href} />;
  }
  return (
    <Suspense fallback={<a {...linkProps} aria-disabled="true" aria-busy="true" />}>
      <ResolvedCreationLink {...props} />
    </Suspense>
  );
}

function ResolvedCreationLink({ href, onlyOnLanding, ...props }: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname() || '/';
  const search = useSearchParams();
  const [landingIntent, setLandingIntent] = useState<string>();
  useEffect(() => {
    // The shared header is outside the landing template; read its server-rendered context.
    setLandingIntent(document.getElementById('landing-page-top')?.dataset.primaryIntent);
  }, [pathname]);
  if (onlyOnLanding && !extractLandingSlug(pathname)) return <Link {...props} href={href} />;
  if (!isLoaded) return <a {...props} aria-disabled="true" aria-busy="true" />;
  const returnPath = buildLandingCreationReturnPath(
    href,
    pathname,
    search ?? new URLSearchParams(),
    landingIntent,
  );
  const locale = href.split('/')[1];
  return (
    <Link
      {...props}
      prefetch={false}
      {...(onlyOnLanding
        ? { 'data-cta-placement': 'navigation', 'data-capture-attribution': 'true' }
        : {})}
      href={isSignedIn ? returnPath : buildAuthEntryPath(locale, 'sign-up', returnPath)}
    />
  );
}
