import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { Suspense, type ComponentType, type ReactNode } from 'react';
import PrintOrderContent from './PrintOrderContent';

const mockTrackOpenAiAdsEvent = jest.fn();
const mockPush = jest.fn();
jest.mock('@/lib/openai-ads/pixel', () => ({
  trackOpenAiAdsEvent: (...args: unknown[]) => mockTrackOpenAiAdsEvent(...args),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: () => (key: string) => key,
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
jest.mock('@/lib/analytics', () => ({
  getGoogleAnalyticsContext: jest.fn().mockResolvedValue(undefined),
  trackPaidAction: jest.fn(),
}));
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: ComponentType<Record<string, unknown>> }>) => {
    const Lazy = React.lazy(loader);
    const Dynamic = (props: Record<string, unknown>) => (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
    return Dynamic;
  },
}));
jest.mock('@/components/print-order/steps/StoryStep', () => ({
  __esModule: true,
  default: ({ onNext }: { onNext: () => void }) => (
    <button type="button" onClick={onNext}>
      story-next
    </button>
  ),
}));
jest.mock('@/components/print-order/steps/AddressStep', () => ({
  __esModule: true,
  default: ({ onNext }: { onNext: () => void }) => (
    <button type="button" onClick={onNext}>
      address-next
    </button>
  ),
}));
jest.mock('@/components/print-order/steps/PaymentStep', () => ({
  __esModule: true,
  default: ({
    onSelectPrintingOption,
    onPlaceOrder,
  }: {
    onSelectPrintingOption: (option: unknown) => void;
    onPlaceOrder: (details: { numberOfCopies: number; totalCost: number }) => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() =>
          onSelectPrintingOption({
            serviceCode: 'printedSoftCover',
            credits: 5,
            isActive: true,
            title: 'Soft cover',
            description: '',
          })
        }
      >
        select-option
      </button>
      <button type="button" onClick={() => onPlaceOrder({ numberOfCopies: 2, totalCost: 10 })}>
        place-order
      </button>
    </>
  ),
}));

const originalFetch = global.fetch;

function mockFetch(printBody: Record<string, unknown>) {
  global.fetch = jest.fn(async (url: string) => {
    if (url === '/api/stories/story-1') {
      return {
        ok: true,
        json: async () => ({
          story: { storyId: 'story-1', status: 'published', title: 'Story', chapterCount: 3 },
        }),
      };
    }
    if (url === '/api/addresses') {
      return {
        ok: true,
        json: async () => ({
          success: true,
          addresses: [{ addressId: 'addr-1', type: 'delivery', line1: 'Rua', city: 'Lisboa' }],
        }),
      };
    }
    if (url === '/api/print-requests')
      return { ok: true, status: 200, json: async () => printBody };
    throw new Error(`Unexpected fetch ${url}`);
  }) as unknown as typeof fetch;
}

async function placeOrder() {
  render(<PrintOrderContent storyId="story-1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'story-next' }));
  fireEvent.click(await screen.findByRole('button', { name: 'address-next' }));
  fireEvent.click(await screen.findByRole('button', { name: 'select-option' }));
  fireEvent.click(screen.getByRole('button', { name: 'place-order' }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en-US/my-stories'));
}

beforeEach(() => {
  mockTrackOpenAiAdsEvent.mockReset();
  mockPush.mockReset();
});
afterEach(() => {
  global.fetch = originalFetch;
});

it('sends print_order_requested with the server event id and copies', async () => {
  mockFetch({ success: true, request: { id: 'print-1' }, adEventId: 'print_print-1' });
  await placeOrder();

  expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledTimes(1);
  expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledWith({
    eventType: 'custom',
    customEventName: 'print_order_requested',
    eventId: 'print_print-1',
    data: {
      type: 'custom',
      contents: [{ id: 'print_order', name: 'Printed book', content_type: 'service', quantity: 2 }],
    },
  });
});

it('does not send print_order_requested without a server event id', async () => {
  mockFetch({ success: true, request: { id: 'print-1' } });
  await placeOrder();

  expect(mockTrackOpenAiAdsEvent).not.toHaveBeenCalled();
});
