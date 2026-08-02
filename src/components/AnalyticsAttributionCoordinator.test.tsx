/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Link from 'next/link';
import { clearConsent, consentStateFromPreferences, saveConsent } from '@/lib/consent';
import AnalyticsAttributionCoordinator from './AnalyticsAttributionCoordinator';

let mockUseUserValue = { isLoaded: true, isSignedIn: false, user: null as { id: string } | null };

jest.mock('@clerk/nextjs', () => ({
  useUser: () => mockUseUserValue,
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/pt-PT',
}));

describe('AnalyticsAttributionCoordinator', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockUseUserValue = { isLoaded: true, isSignedIn: false, user: null };
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

  it('captures attribution then retries a short authenticated 401 race without duplicates', async () => {
    saveConsent(consentStateFromPreferences({ analytics: true, advertising: false }), {
      analytics: true,
      advertising: false,
    });
    mockUseUserValue = { isLoaded: true, isSignedIn: true, user: { id: 'user-1' } };
    window.gtag = jest.fn((...args: unknown[]) => {
      if (args[0] !== 'get') return;
      const callback = args[3] as (value: unknown) => void;
      callback(args[2] === 'client_id' ? '123.456' : 1712345678);
    });

    let linkAttempts = 0;
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/analytics/attribution')) {
        return new Response(JSON.stringify({ captured: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.endsWith('/api/analytics/attribution/link')) {
        linkAttempts += 1;
        return new Response(
          JSON.stringify(linkAttempts === 1 ? { error: 'Unauthorized' } : { linked: true }),
          {
            status: linkAttempts === 1 ? 401 : 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    global.fetch = fetchMock;

    render(<AnalyticsAttributionCoordinator />);

    await waitFor(() => expect(linkAttempts).toBe(2), { timeout: 3_000 });
    expect(
      fetchMock.mock.calls.filter(([input]) =>
        String(input).endsWith('/api/analytics/attribution'),
      ),
    ).toHaveLength(1);
    expect(
      fetchMock.mock.calls.filter(([input]) =>
        String(input).endsWith('/api/analytics/attribution/link'),
      ),
    ).toHaveLength(2);
  });
});
