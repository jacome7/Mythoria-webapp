import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import Step1Page from './page';

let mockAuth = { isLoaded: false, isSignedIn: false, userId: null as string | null };
const mockFetch = jest.fn();
const mockTranslate = (key: string) => key;
const mockSearch = new URLSearchParams();
jest.mock('@clerk/nextjs', () => ({ useAuth: () => mockAuth }));
jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: () => mockTranslate,
}));
jest.mock('next/navigation', () => ({ useSearchParams: () => mockSearch }));
jest.mock('@/components/ClientAuthWrapper', () => ({
  __esModule: true,
  default: ({
    children,
    signedOutFallback,
  }: {
    children: React.ReactNode;
    signedOutFallback: React.ReactNode;
  }) => (mockAuth.isLoaded ? (mockAuth.isSignedIn ? children : signedOutFallback) : null),
}));
jest.mock('@/components/StepNavigation', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ProgressIndicator', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/analytics', () => ({
  trackStoryCreation: { started: jest.fn(), stepViewed: jest.fn() },
}));

beforeEach(() => {
  mockAuth = { isLoaded: false, isSignedIn: false, userId: null };
  mockFetch.mockReset();
  global.fetch = mockFetch;
  localStorage.clear();
});

it('does not request a private profile while auth loads or the visitor is signed out', () => {
  const { rerender } = render(<Step1Page />);
  expect(mockFetch).not.toHaveBeenCalled();
  mockAuth = { isLoaded: true, isSignedIn: false, userId: null };
  rerender(<Step1Page />);
  expect(screen.getByText('unauthenticated.signIn')).toBeInTheDocument();
  expect(mockFetch).not.toHaveBeenCalled();
});

it('loads the profile when authentication completes', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ displayName: 'Test Author' }) });
  const { rerender } = render(<Step1Page />);
  mockAuth = { isLoaded: true, isSignedIn: true, userId: 'signed-in-user' };
  rerender(<Step1Page />);
  expect(await screen.findByDisplayValue('Test Author')).toBeInTheDocument();
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', { signal: expect.any(AbortSignal) });
});

it('cancels a stale profile request on sign-out without reporting a fetch error', async () => {
  let resolve!: (value: unknown) => void;
  mockFetch.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  mockAuth = { isLoaded: true, isSignedIn: true, userId: 'signed-in-user' };
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const { rerender } = render(<Step1Page />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const signal = mockFetch.mock.calls[0][1].signal as AbortSignal;
    mockAuth = { isLoaded: true, isSignedIn: false, userId: null };
    rerender(<Step1Page />);
    expect(signal.aborted).toBe(true);
    await act(async () => resolve({ ok: false }));
    expect(log).not.toHaveBeenCalled();
    expect(screen.getByText('unauthenticated.signIn')).toBeInTheDocument();
  } finally {
    log.mockRestore();
  }
});
