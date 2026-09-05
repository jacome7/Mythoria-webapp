/** @jest-environment jsdom */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    jest.useRealTimers();
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

  function prepareSignedInRetry(userId: string, pendingAttempts: number) {
    saveConsent(consentStateFromPreferences({ analytics: true, advertising: false }), {
      analytics: true,
      advertising: false,
    });
    mockUseUserValue = { isLoaded: true, isSignedIn: true, user: { id: userId } };
    window.gtag = jest.fn((...args: unknown[]) => {
      if (args[0] === 'get')
        (args[3] as (value: unknown) => void)(args[2] === 'client_id' ? '123.456' : 1712345678);
    });
    let attempts = 0;
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/analytics/attribution/link')) {
        attempts += 1;
        return new Response(
          JSON.stringify({
            linked: true,
            ...(attempts <= pendingAttempts ? { signUpPending: true } : {}),
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify(
          url.endsWith('/api/analytics/attribution') ? { captured: true } : { linked: true },
        ),
        { status: 200 },
      );
    });
    return () => attempts;
  }

  const useRetryClock = () =>
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
  afterEach(() => jest.useRealTimers());

  it('retries a signup delivery claim after general association succeeds', async () => {
    useRetryClock();
    const attempts = prepareSignedInRetry('claim-released-user', 1);
    render(<AnalyticsAttributionCoordinator />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(attempts()).toBe(2);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(310000);
    });
    expect(attempts()).toBe(2);
  });

  it('stops after twelve attempts covering the five-minute claim lease', async () => {
    useRetryClock();
    const attempts = prepareSignedInRetry('claim-still-pending-user', Infinity);
    render(<AnalyticsAttributionCoordinator />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(305000);
    });
    expect(attempts()).toBe(12);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(600000);
    });
    expect(attempts()).toBe(12);
  });

  it('stops pending retries when analytics consent is revoked', async () => {
    useRetryClock();
    const attempts = prepareSignedInRetry('claim-revoked-user', Infinity);
    render(<AnalyticsAttributionCoordinator />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    expect(attempts()).toBe(1);
    saveConsent(consentStateFromPreferences({ analytics: false, advertising: false }), {
      analytics: false,
      advertising: false,
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(305000);
    });
    expect(attempts()).toBe(1);
  });

  it('stops pending retries when the authenticated user signs out', async () => {
    useRetryClock();
    const attempts = prepareSignedInRetry('claim-signout-user', Infinity);
    const { rerender } = render(<AnalyticsAttributionCoordinator />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    expect(attempts()).toBe(1);
    mockUseUserValue = { isLoaded: true, isSignedIn: false, user: null };
    rerender(<AnalyticsAttributionCoordinator />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(305000);
    });
    expect(attempts()).toBe(1);
  });
});
