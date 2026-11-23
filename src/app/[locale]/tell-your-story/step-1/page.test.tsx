import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
jest.mock('@/components/StepNavigation', () => ({
  __esModule: true,
  default: ({ nextHref, onNext }: { nextHref: string; onNext: () => Promise<boolean> }) => (
    <button type="button" data-destination={nextHref} onClick={onNext}>
      Next
    </button>
  ),
}));
jest.mock('@/components/ProgressIndicator', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/analytics', () => ({
  trackStoryCreation: { started: jest.fn(), stepViewed: jest.fn(), stepCompleted: jest.fn() },
}));

beforeEach(() => {
  mockAuth = { isLoaded: false, isSignedIn: false, userId: null };
  mockFetch.mockReset();
  mockSearch.delete('returnTo');
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

it('saves edited author details then returns to review for the current draft', async () => {
  mockAuth = { isLoaded: true, isSignedIn: true, userId: 'signed-in-user' };
  mockSearch.set('returnTo', 'review');
  localStorage.setItem('currentStoryId', 'existing-draft');
  localStorage.setItem(
    'step1Data',
    JSON.stringify({ customAuthor: 'Old Name', dedicationMessage: 'For Alice' }),
  );
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ displayName: 'Test Author' }) });
  render(<Step1Page />);

  const input = await screen.findByDisplayValue('Old Name');
  fireEvent.change(input, { target: { value: 'New Name' } });
  const next = screen.getByRole('button', { name: 'Next' });
  expect(next).toHaveAttribute('data-destination', '/tell-your-story/step-5');
  fireEvent.click(next);
  expect(JSON.parse(localStorage.getItem('step1Data')!)).toEqual({
    customAuthor: 'New Name',
    dedicationMessage: 'For Alice',
  });
  expect(localStorage.getItem('currentStoryId')).toBe('existing-draft');
});
