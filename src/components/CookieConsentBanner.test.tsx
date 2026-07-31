/** @jest-environment jsdom */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { clearConsent, getStoredConsent } from '@/lib/consent';
import CookieConsentBanner from './CookieConsentBanner';

jest.mock('next-intl', () => ({
  useLocale: () => 'pt-PT',
  useTranslations: () => (key: string) => key,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearConsent();
    window.gtag = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function showBanner() {
    render(<CookieConsentBanner />);
    await act(async () => jest.advanceTimersByTimeAsync(500));
  }

  it('persists an explicit rejection and allows the visitor to continue', async () => {
    await showBanner();
    fireEvent.click(screen.getByRole('button', { name: 'rejectAll' }));

    expect(getStoredConsent()).toMatchObject({
      version: 2,
      preferences: { analytics: false, advertising: false },
    });
  });

  it('persists an explicit accept-all choice', async () => {
    await showBanner();
    fireEvent.click(screen.getByRole('button', { name: 'acceptAll' }));

    expect(getStoredConsent()).toMatchObject({
      preferences: { analytics: true, advertising: true },
    });
  });

  it('supports independent analytics and advertising choices', async () => {
    await showBanner();
    fireEvent.click(screen.getByRole('button', { name: 'customize' }));
    const toggles = screen.getAllByRole('checkbox');
    fireEvent.click(toggles[0]);
    fireEvent.click(screen.getByRole('button', { name: 'savePreferences' }));

    expect(getStoredConsent()).toMatchObject({
      preferences: { analytics: true, advertising: false },
      state: {
        analytics_storage: 'granted',
        ad_storage: 'denied',
      },
    });
  });
});
