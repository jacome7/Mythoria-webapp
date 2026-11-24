/** @jest-environment jsdom */

import { act, render, waitFor } from '@testing-library/react';
import {
  clearConsent,
  consentStateFromPreferences,
  saveConsent,
  updateGoogleConsent,
} from '@/lib/consent';
import { OAIQ_SCRIPT_SRC, __resetOpenAiPixelForTests } from '@/lib/openai-ads/pixel';
import OpenAIAdsPixel, { __resetOpenAIAdsPixelForTests } from './OpenAIAdsPixel';

type MockUser = {
  id: string;
  primaryEmailAddress?: { emailAddress: string };
  firstName?: string | null;
  lastName?: string | null;
};

let mockPathname = '/pt-PT';
let mockUseUserValue: { isLoaded: boolean; isSignedIn: boolean; user: MockUser | null } = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
};

jest.mock('@clerk/nextjs', () => ({
  useUser: () => mockUseUserValue,
}));

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// jsdom has no Web Crypto; hashing itself is covered by hashing.test.ts.
jest.mock('@/lib/openai-ads/hashing', () => {
  const actual = jest.requireActual('@/lib/openai-ads/hashing');
  return {
    ...actual,
    hashForOpenAiBrowser: async (kind: string, value: string | null | undefined) => {
      const normalized = actual.normalizeForOpenAi(kind, value);
      return normalized === undefined ? undefined : `sha256(${normalized})`;
    },
  };
});

const PIXEL_ID = 'test-pixel-id';

function setConsent(advertising: boolean) {
  const preferences = { analytics: false, advertising };
  const state = consentStateFromPreferences(preferences);
  saveConsent(state, preferences);
  act(() => updateGoogleConsent(state));
}

const calls = () => (window.oaiq?.q ?? []) as unknown[][];
const scriptTag = () => document.querySelector(`script[src="${OAIQ_SCRIPT_SRC}"]`);

describe('OpenAIAdsPixel', () => {
  const originalPixelId = process.env.NEXT_PUBLIC_OPENAI_AUDIT_PIXEL_ID;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_OPENAI_AUDIT_PIXEL_ID = PIXEL_ID;
    process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_ORIGIN = window.location.origin;
    process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID = 'G-TEST123';
    window.history.replaceState(null, '', '/en-US');
    mockPathname = '/pt-PT';
    mockUseUserValue = { isLoaded: true, isSignedIn: false, user: null };
    __resetOpenAiPixelForTests();
    __resetOpenAIAdsPixelForTests();
    clearConsent();
    delete window.oaiq;
    delete window.__mythoriaOaiqLoaded;
    window.gtag = jest.fn();
    document.querySelectorAll('script[src]').forEach((script) => script.remove());
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_OPENAI_AUDIT_PIXEL_ID = originalPixelId;
    delete process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_ORIGIN;
    delete process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID;
  });

  it('renders nothing and loads nothing without a pixel id', () => {
    delete process.env.NEXT_PUBLIC_OPENAI_AUDIT_PIXEL_ID;
    const preferences = { analytics: true, advertising: true };
    saveConsent(consentStateFromPreferences(preferences), preferences);
    const { container } = render(<OpenAIAdsPixel />);
    expect(container).toBeEmptyDOMElement();
    expect(window.oaiq).toBeUndefined();
    expect(scriptTag()).toBeNull();
  });

  it('does not load the SDK before advertising consent, then loads it on grant', () => {
    render(<OpenAIAdsPixel />);
    expect(window.oaiq).toBeUndefined();
    expect(scriptTag()).toBeNull();

    setConsent(false);
    expect(window.oaiq).toBeUndefined();
    expect(scriptTag()).toBeNull();

    setConsent(true);
    expect(scriptTag()).not.toBeNull();
    expect(calls().slice(0, 3)).toEqual([
      ['consent', true],
      ['init', { pixelId: PIXEL_ID }],
      [
        'measure',
        'page_viewed',
        { type: 'contents', contents: [{ id: '/', content_type: 'page' }] },
        { event_id: expect.any(String) },
      ],
    ]);
  });

  it('withdraws consent when advertising is revoked after load', () => {
    const preferences = { analytics: false, advertising: true };
    saveConsent(consentStateFromPreferences(preferences), preferences);
    render(<OpenAIAdsPixel />);
    expect(scriptTag()).not.toBeNull();

    setConsent(false);
    expect(calls().at(-1)).toEqual(['consent', false]);
  });

  it('sends one redacted page view per pathname', () => {
    const preferences = { analytics: false, advertising: true };
    saveConsent(consentStateFromPreferences(preferences), preferences);
    const { rerender } = render(<OpenAIAdsPixel />);

    mockPathname = '/pt-PT/s/0b8c7e1e-1f2a-4c3d-9e8f-0a1b2c3d4e5f';
    window.history.replaceState(null, '', mockPathname);
    rerender(<OpenAIAdsPixel />);
    rerender(<OpenAIAdsPixel />);

    const pageViews = calls()
      .filter((call) => call[0] === 'measure')
      .map((call) => (call[2] as { contents: { id: string }[] }).contents[0].id);
    expect(pageViews).toEqual(['/']);
  });

  it('re-runs init with hashed user identifiers once per signed-in user', async () => {
    const preferences = { analytics: false, advertising: true };
    saveConsent(consentStateFromPreferences(preferences), preferences);
    mockUseUserValue = {
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: 'user_123',
        primaryEmailAddress: { emailAddress: ' Reader@Example.com ' },
        firstName: "O'Connor",
        lastName: null,
      },
    };
    const { rerender } = render(<OpenAIAdsPixel />);

    const userInit = () =>
      calls().filter(
        (call) => call[0] === 'init' && (call[1] as { user?: unknown }).user !== undefined,
      );
    await waitFor(() => expect(userInit()).toHaveLength(1));
    expect(userInit()[0][1]).toEqual({
      pixelId: PIXEL_ID,
      user: {
        email_sha256: 'sha256(reader@example.com)',
        external_id_sha256: 'sha256(user_123)',
        first_name_sha256: 'sha256(oconnor)',
      },
    });

    mockUseUserValue = { ...mockUseUserValue, user: { ...mockUseUserValue.user! } };
    rerender(<OpenAIAdsPixel />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(userInit()).toHaveLength(1);
  });
});
