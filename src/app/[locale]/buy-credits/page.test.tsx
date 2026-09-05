import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import BuyCreditsPage from './page';

let mockSearch = new URLSearchParams('package=2');
const mockTranslate = (key: string) => key;
jest.mock('next-intl', () => ({ useLocale: () => 'pt-PT', useTranslations: () => mockTranslate }));
jest.mock('next/navigation', () => ({ useSearchParams: () => mockSearch }));
jest.mock('@clerk/nextjs', () => ({
  Show: ({ when, children }: { when: string; children: ReactNode }) =>
    when === 'signed-out' ? children : null,
}));
jest.mock('@/components/CartView', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/PaymentSelector', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/PromotionCodeRedeemer', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ScrollFadeIn', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/lib/analytics', () => ({
  trackCommerce: { viewItemList: jest.fn() },
  getGoogleAnalyticsContext: jest.fn(),
}));
jest.mock('@/lib/consent', () => ({ ensureConsentChoice: jest.fn() }));
const catalogue = { packages: [{ id: 2, key: 'ten', credits: 10, price: 9 }] };
const originalFetch = global.fetch;
beforeEach(() => {
  mockSearch = new URLSearchParams('package=2');
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => catalogue });
});
afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

it('waits for package validation and preserves the selection in both auth links without paying', async () => {
  let resolveCatalogue!: (value: unknown) => void;
  global.fetch = jest.fn().mockReturnValue(
    new Promise((resolve) => {
      resolveCatalogue = resolve;
    }),
  );
  render(<BuyCreditsPage />);
  expect(screen.queryByRole('link', { name: 'signedOut.signIn' })).not.toBeInTheDocument();
  resolveCatalogue({ ok: true, json: async () => catalogue });
  for (const label of ['signedOut.signIn', 'signedOut.createAccount']) {
    const link = await screen.findByRole('link', { name: label });
    const entry = new URL(link.getAttribute('href')!, 'https://mythoria.pt');
    expect(entry.searchParams.get('redirect')).toBe('/pt-PT/buy-credits?package=2');
  }
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith('/api/pricing/credit-packages');
});
it.each(['2extra', '999'])('returns to normal package selection for invalid ID %s', async (id) => {
  mockSearch = new URLSearchParams({ package: id });
  render(<BuyCreditsPage />);
  const entry = new URL(
    (await screen.findByRole('link', { name: 'signedOut.signIn' })).getAttribute('href')!,
    'https://mythoria.pt',
  );
  expect(entry.searchParams.get('redirect')).toBe('/pt-PT/buy-credits');
});
it('offers catalogue retry without silently dropping the intended package', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => catalogue });
  render(<BuyCreditsPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'actions.tryAgain' }));
  await waitFor(() =>
    expect(screen.getByRole('link', { name: 'signedOut.signIn' })).toHaveAttribute(
      'href',
      '/pt-PT/sign-in?redirect=%2Fpt-PT%2Fbuy-credits%3Fpackage%3D2',
    ),
  );
});
