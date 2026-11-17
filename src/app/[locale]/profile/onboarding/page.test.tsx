import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import OnboardingProfilePage from './page';

const mockTrackOpenAiAdsEvent = jest.fn();
let mockPixelEnabled = true;
let mockUser: { id: string; createdAt?: Date | null } | null = { id: 'user_abc' };
jest.mock('@/lib/openai-ads/pixel', () => ({
  trackOpenAiAdsEvent: (...args: unknown[]) => mockTrackOpenAiAdsEvent(...args),
  isOpenAiPixelEnabled: () => mockPixelEnabled,
}));
jest.mock('@clerk/nextjs', () => ({ useUser: () => ({ user: mockUser }) }));
jest.mock('next-intl', () => {
  const translate = Object.assign((key: string) => key, { rich: (key: string) => key });
  return { useLocale: () => 'en-US', useTranslations: () => translate };
});
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
jest.mock('@/components/PromotionCodeRedeemer', () => ({ __esModule: true, default: () => null }));

const originalFetch = global.fetch;
const author = { authorId: 'author-1', email: 'a@b.test', displayName: 'Ana' };
const HOUR = 60 * 60 * 1000;
let mockAuthorCreatedAt: string | undefined;

beforeEach(() => {
  mockTrackOpenAiAdsEvent.mockReset();
  mockUser = { id: 'user_abc' };
  mockPixelEnabled = true;
  mockAuthorCreatedAt = new Date(Date.now() - HOUR).toISOString();
  window.sessionStorage.clear();
  window.localStorage.clear();
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/profile' && init?.method === 'PATCH') {
      const patch = JSON.parse(String(init.body));
      return {
        ok: true,
        json: async () => ({
          author: {
            ...author,
            ...patch,
            ...(mockAuthorCreatedAt ? { createdAt: mockAuthorCreatedAt } : {}),
          },
        }),
      };
    }
    if (url === '/api/profile') return { ok: true, json: async () => ({ author }) };
    return { ok: true, json: async () => ({}) };
  }) as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
});

const patchCalls = () =>
  (global.fetch as jest.Mock).mock.calls.filter(([, init]) => init?.method === 'PATCH');

// `saving` is cleared in the PATCH handler's `finally`, after any tracking call.
const waitForSaveToFinish = () =>
  waitFor(() => {
    expect(screen.queryByText('saving')).not.toBeInTheDocument();
    expect(screen.getByText('saved')).toBeInTheDocument();
  });

async function saveName(name: string) {
  const input = await screen.findByPlaceholderText('Type here');
  fireEvent.change(input, { target: { value: name } });
  fireEvent.blur(input);
}

it('sends registration_completed once per session after a successful profile save', async () => {
  render(<OnboardingProfilePage />);
  await saveName('Ana Maria');
  await waitFor(() => expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledTimes(1));
  expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledWith({
    eventType: 'registration_completed',
    eventId: 'signup_user_abc',
    data: { type: 'customer_action' },
  });

  await saveName('Ana Maria Silva');
  await waitFor(() => expect(patchCalls()).toHaveLength(2));
  await waitForSaveToFinish();
  expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledTimes(1);
});

it('does not send registration_completed without a signed-in Clerk user', async () => {
  mockUser = null;
  render(<OnboardingProfilePage />);
  await saveName('Ana Maria');
  await waitFor(() => expect(patchCalls()).toHaveLength(1));
  await waitForSaveToFinish();
  expect(mockTrackOpenAiAdsEvent).not.toHaveBeenCalled();
});

it('leaves the session guard unset until the Pixel is enabled', async () => {
  mockPixelEnabled = false;
  render(<OnboardingProfilePage />);
  await saveName('Ana Maria');
  await waitFor(() => expect(patchCalls()).toHaveLength(1));
  await waitForSaveToFinish();
  expect(mockTrackOpenAiAdsEvent).not.toHaveBeenCalled();
  expect(window.sessionStorage.getItem('mythoria_oaiq_signup_user_abc')).toBeNull();

  mockPixelEnabled = true;
  await saveName('Ana Maria Silva');
  await waitFor(() => expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledTimes(1));
  expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledWith(
    expect.objectContaining({ eventId: 'signup_user_abc' }),
  );
  expect(window.sessionStorage.getItem('mythoria_oaiq_signup_user_abc')).toBe('1');
});

it('does not send registration_completed when an existing user edits their profile', async () => {
  mockAuthorCreatedAt = new Date(Date.now() - 30 * 24 * HOUR).toISOString();
  render(<OnboardingProfilePage />);
  await saveName('Ana Maria');
  await waitFor(() => expect(patchCalls()).toHaveLength(1));
  await waitForSaveToFinish();
  expect(mockTrackOpenAiAdsEvent).not.toHaveBeenCalled();
  expect(window.sessionStorage.getItem('mythoria_oaiq_signup_user_abc')).toBeNull();
});

it('falls back to the Clerk creation time when the profile response has none', async () => {
  mockAuthorCreatedAt = undefined;
  mockUser = { id: 'user_abc', createdAt: new Date(Date.now() - 2 * HOUR) };
  render(<OnboardingProfilePage />);
  await saveName('Ana Maria');
  await waitFor(() => expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledTimes(1));
});

it('does not send registration_completed when the creation time is unknown or too old', async () => {
  mockAuthorCreatedAt = undefined;
  mockUser = { id: 'user_abc', createdAt: new Date(Date.now() - 25 * HOUR) };
  render(<OnboardingProfilePage />);
  await saveName('Ana Maria');
  await waitFor(() => expect(patchCalls()).toHaveLength(1));
  await waitForSaveToFinish();

  mockUser = { id: 'user_abc', createdAt: null };
  await saveName('Ana Maria Silva');
  await waitFor(() => expect(patchCalls()).toHaveLength(2));
  await waitForSaveToFinish();
  expect(mockTrackOpenAiAdsEvent).not.toHaveBeenCalled();
});
