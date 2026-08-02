export function getAlternateLocalePath(alternateHref: string | null | undefined): string | null {
  if (!alternateHref) {
    return null;
  }

  try {
    const url = new URL(alternateHref, 'https://mythoria.pt');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function swapLocaleInPath(
  pathname: string,
  newLocale: string,
  supportedLocales: readonly string[],
): string {
  const segments = pathname.split('/');

  if (supportedLocales.includes(segments[1])) {
    segments[1] = newLocale;
  } else {
    segments.unshift('', newLocale);
  }

  return segments.join('/');
}

export function getLocaleSwitchPath(
  pathname: string,
  newLocale: string,
  supportedLocales: readonly string[],
  alternateHref?: string | null,
): string {
  const alternatePath = getAlternateLocalePath(alternateHref);
  if (alternatePath) return alternatePath;

  const segments = pathname.split('/');
  const isLandingPage = supportedLocales.includes(segments[1]) && segments[2] === 'lp';

  return isLandingPage ? `/${newLocale}` : swapLocaleInPath(pathname, newLocale, supportedLocales);
}
