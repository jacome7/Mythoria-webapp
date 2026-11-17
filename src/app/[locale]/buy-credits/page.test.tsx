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
const mockTrackOpenAiAdsEvent = jest.fn();
let mockPixelEnabled = true;
jest.mock('@/lib/openai-ads/pixel', () => ({
  trackOpenAiAdsEvent: (...args: unknown[]) => mockTrackOpenAiAdsEvent(...args),
  isOpenAiPixelEnabled: () => mockPixelEnabled,
}));
const catalogue = { packages: [{ id: 2, key: 'ten', credits: 10, price: 9 }] };
const originalFetch = global.fetch;
beforeEach(() => {
  mockTrackOpenAiAdsEvent.mockReset();
  mockPixelEnabled = true;
  window.sessionStorage.clear();
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
it('sends OpenAI contents_viewed for the package list with prices in cents', async () => {
  render(<BuyCreditsPage />);
  await waitFor(() => expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledTimes(1));
  expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      eventType: 'contents_viewed',
      data: {
        type: 'contents',
        contents: [
          {
            id: 'ten',
            name: '10 Mythoria Credits',
            content_type: 'product',
            quantity: 1,
            amount: 900,
            currency: 'EUR',
          },
        ],
      },
    }),
  );
});
describe('confirmed Stripe order', () => {
  const session = {
    success: true,
    status: 'completed',
    orderId: 'order-uuid-1',
    amount: 900,
    currency: 'eur',
    credits: 10,
    ecommerce: {
      transaction_id: 'order-uuid-1',
      currency: 'EUR',
      value: 8.49,
      items: [
        {
          item_id: 'credit_package_ten',
          item_name: '10 Mythoria Credits',
          item_variant: 'ten',
          price: 9,
          quantity: 1,
        },
      ],
    },
  };
  beforeEach(() => {
    jest.useFakeTimers();
    mockSearch = new URLSearchParams('payment=stripe_success&session_id=cs_test_1');
    jest.spyOn(window.history, 'replaceState').mockImplementation(() => undefined);
    global.fetch = jest.fn(async (url: string) =>
      String(url).startsWith('/api/payments/stripe/session')
        ? { ok: true, json: async () => session }
        : { ok: true, json: async () => catalogue },
    ) as unknown as typeof fetch;
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  const orderCalls = () =>
    mockTrackOpenAiAdsEvent.mock.calls.filter(([c]) => c.eventType === 'order_created');

  it('fires order_created once per order with the deterministic order event id', async () => {
    const first = render(<BuyCreditsPage />);
    await waitFor(() => expect(orderCalls()).toHaveLength(1));
    expect(orderCalls()[0][0]).toEqual({
      eventType: 'order_created',
      eventId: 'order_order-uuid-1',
      data: {
        type: 'contents',
        amount: 900,
        currency: 'EUR',
        contents: [
          {
            id: 'ten',
            name: '10 Mythoria Credits',
            content_type: 'product',
            quantity: 1,
            amount: 900,
            currency: 'EUR',
          },
        ],
      },
    });
    first.unmount();

    render(<BuyCreditsPage />);
    // replaceState runs right after the order tracking call in the same success branch.
    await waitFor(() => expect(window.history.replaceState).toHaveBeenCalledTimes(2));
    expect(orderCalls()).toHaveLength(1);
  });

  it('sends exactly the server-built order_created input when the session API returns it', async () => {
    const withServerInput = {
      ...session,
      adConversion: {
        orderId: 'order-uuid-1',
        amountCents: 849,
        currency: 'EUR',
        packageKey: 'credit_package_ten',
        packageName: '10 Mythoria Credits',
        credits: 10,
      },
    };
    global.fetch = jest.fn(async (url: string) =>
      String(url).startsWith('/api/payments/stripe/session')
        ? { ok: true, json: async () => withServerInput }
        : { ok: true, json: async () => catalogue },
    ) as unknown as typeof fetch;

    render(<BuyCreditsPage />);
    await waitFor(() => expect(orderCalls()).toHaveLength(1));
    expect(orderCalls()[0][0]).toEqual({
      eventType: 'order_created',
      eventId: 'order_order-uuid-1',
      data: {
        type: 'contents',
        amount: 849,
        currency: 'EUR',
        contents: [
          {
            id: 'credit_package_ten',
            name: '10 Mythoria Credits',
            content_type: 'product',
            quantity: 1,
            amount: 849,
            currency: 'EUR',
          },
        ],
      },
    });
  });

  it('ignores a server input for a different order and falls back to the response totals', async () => {
    const mismatched = {
      ...session,
      adConversion: {
        orderId: 'another-order',
        amountCents: 1,
        currency: 'EUR',
        packageKey: 'x',
        packageName: 'x',
        credits: 1,
      },
    };
    global.fetch = jest.fn(async (url: string) =>
      String(url).startsWith('/api/payments/stripe/session')
        ? { ok: true, json: async () => mismatched }
        : { ok: true, json: async () => catalogue },
    ) as unknown as typeof fetch;

    render(<BuyCreditsPage />);
    await waitFor(() => expect(orderCalls()).toHaveLength(1));
    expect(orderCalls()[0][0]).toMatchObject({
      eventId: 'order_order-uuid-1',
      data: { amount: 900 },
    });
  });

  it('does not set the order guard while the Pixel is disabled', async () => {
    mockPixelEnabled = false;
    const first = render(<BuyCreditsPage />);
    await waitFor(() => expect(window.history.replaceState).toHaveBeenCalledTimes(1));
    expect(orderCalls()).toHaveLength(0);
    expect(window.sessionStorage.getItem('mythoria_oaiq_order_order-uuid-1')).toBeNull();
    first.unmount();

    mockPixelEnabled = true;
    render(<BuyCreditsPage />);
    await waitFor(() => expect(orderCalls()).toHaveLength(1));
    expect(orderCalls()[0][0].eventId).toBe('order_order-uuid-1');
  });
});
