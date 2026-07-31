/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import Link from 'next/link';
import { clearConsent } from '@/lib/consent';
import AnalyticsAttributionCoordinator from './AnalyticsAttributionCoordinator';

jest.mock('next/navigation', () => ({
  usePathname: () => '/pt-PT',
}));

describe('AnalyticsAttributionCoordinator', () => {
  beforeEach(() => {
    clearConsent();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(
      {},
      '',
      '/pt-PT?utm_source=google&gclid=click-1&email=private%40example.com',
    );
  });

  it('passes allowlisted campaign data through same-origin navigation without storage', () => {
    render(
      <>
        <AnalyticsAttributionCoordinator />
        <Link href="/pt-PT/sign-up" onClick={(event) => event.preventDefault()}>
          Continue
        </Link>
      </>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Continue' }));
    const destination = new URL(
      (screen.getByRole('link', { name: 'Continue' }) as HTMLAnchorElement).href,
    );
    expect(destination.searchParams.get('utm_source')).toBe('google');
    expect(destination.searchParams.get('gclid')).toBe('click-1');
    expect(destination.searchParams.has('email')).toBe(false);
    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage).toHaveLength(0);
  });
});
