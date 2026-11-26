import { webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';
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
  default: ({
    onNext,
    onEditAddress,
    onSaveAddress,
    selectedAddress,
    editingAddress,
  }: {
    onNext: () => void;
    onEditAddress: (address: unknown) => void;
    onSaveAddress: (address: unknown) => void;
    selectedAddress: { line1: string };
    editingAddress: { line1: string } | null;
  }) => (
    <>
      <button type="button" onClick={onNext}>
        address-next
      </button>
      <button type="button" onClick={() => onEditAddress(selectedAddress)}>
        edit-address
      </button>
      {editingAddress && (
        <button
          type="button"
          onClick={() => onSaveAddress({ ...editingAddress, line1: 'Rua nova' })}
        >
          save-address
        </button>
      )}
    </>
  ),
}));
jest.mock('@/components/print-order/steps/PaymentStep', () => ({
  __esModule: true,
  default: ({
    address,
    refreshVersion,
    story,
    onSelectPrintingOption,
    onPlaceOrder,
  }: {
    address: { line1: string };
    refreshVersion: number;
    story: { editionRevision?: string };
    onSelectPrintingOption: (option: unknown) => void;
    onPlaceOrder: (details: { numberOfCopies: number; totalCost: number }) => void;
  }) => (
    <>
      <output>{address.line1}</output>
      <output>{`pricing-${refreshVersion}`}</output>
      <button
        type="button"
        onClick={() =>
          onSelectPrintingOption({
            serviceCode: story.editionRevision ? 'printedHardCover' : 'printedSoftCover',
            editionRevision: story.editionRevision,
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

function mockFetch(
  printBody: Record<string, unknown>,
  onSubmit?: (init?: RequestInit) => Response | void,
  getStory?: () => Record<string, unknown>,
) {
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/print-requests/story/story-1') {
      return {
        ok: true,
        json: async () => ({
          story: {
            storyId: 'story-1',
            status: 'published',
            title: 'Story',
            chapterCount: 3,
            ...getStory?.(),
          },
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
    if (url === '/api/addresses/addr-1' && init?.method === 'PUT') {
      return {
        ok: true,
        json: async () => ({ success: true, address: JSON.parse(String(init.body)) }),
      };
    }
    if (url === '/api/print-requests') {
      return onSubmit?.(init) ?? { ok: true, status: 200, json: async () => printBody };
    }
    throw new Error(`Unexpected fetch ${url}`);
  }) as unknown as typeof fetch;
}

async function submitOrder() {
  const view = render(<PrintOrderContent storyId="story-1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'story-next' }));
  fireEvent.click(await screen.findByRole('button', { name: 'address-next' }));
  fireEvent.click(await screen.findByRole('button', { name: 'select-option' }));
  fireEvent.click(screen.getByRole('button', { name: 'place-order' }));
  return view;
}

async function placeOrder() {
  await submitOrder();
  await screen.findByRole('heading', { name: 'confirmation.title' });
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder, configurable: true });
});
beforeEach(() => {
  sessionStorage.clear();
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

it('reuses a pending checkout intent after response loss and reload, then clears it on confirmation', async () => {
  const ids: string[] = [];
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    mockFetch({ success: true, request: { id: 'paid-order' } }, (init) => {
      const body = JSON.parse(String(init?.body));
      expect(body).not.toHaveProperty('storyId');
      ids.push(body.checkout.intentId);
      if (ids.length === 1) throw new TypeError('Interrupted after submission');
    });
    const first = await submitOrder();
    await screen.findByText('errors.orderPending');
    first.unmount();
    const replay = await submitOrder();
    await screen.findByRole('heading', { name: 'confirmation.title' });
    replay.unmount();
    await placeOrder();
    expect(ids).toHaveLength(3);
    expect(ids[0]).toMatch(/^[a-f0-9-]{36}$/i);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[1]);
  } finally {
    errorLog.mockRestore();
  }
});

it('retries an uncertain submission using the same request body and keeps checkout open', async () => {
  const bodies: string[] = [];
  mockFetch({ success: true }, (init) => {
    bodies.push(String(init?.body));
    if (bodies.length === 1)
      return { status: 503, json: async () => ({ code: 'print_ticket_pending' }) } as Response;
  });
  await submitOrder();
  const retry = await screen.findByRole('button', { name: 'buttons.checkOrder' });
  expect(screen.getByRole('button', { name: 'place-order' })).toBeDisabled();
  fireEvent.click(retry);
  await screen.findByRole('heading', { name: 'confirmation.title' });
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toBe(bodies[0]);
});

it('refreshes payment details and requires another confirmation when the price changes', async () => {
  const submit = jest.fn(
    () => ({ status: 409, json: async () => ({ code: 'pricing_changed' }) }) as Response,
  );
  mockFetch({}, submit);
  await submitOrder();
  expect(await screen.findByText('errors.pricingChanged')).toBeInTheDocument();
  expect(screen.getByText('pricing-1')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'place-order' })).toBeEnabled();
  expect(submit).toHaveBeenCalledTimes(1);
});

it('reloads the revised story and returns to the edition preview before resubmission', async () => {
  const revisionRequests: string[] = [];
  const getStory = jest
    .fn()
    .mockReturnValueOnce({ editionRevision: 'revision-1' })
    .mockReturnValue({ editionRevision: 'revision-2' });
  mockFetch(
    { success: true },
    (init) => {
      const body = JSON.parse(String(init?.body));
      revisionRequests.push(body.checkout.printingOption.editionRevision);
      if (revisionRequests.length === 1)
        return { status: 409, json: async () => ({ code: 'print_edition_changed' }) } as Response;
    },
    getStory,
  );
  await submitOrder();
  expect(await screen.findByText('errors.editionChanged')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'story-next' })).toBeInTheDocument();
  expect(revisionRequests).toEqual(['revision-1']);
  fireEvent.click(screen.getByRole('button', { name: 'story-next' }));
  fireEvent.click(screen.getByRole('button', { name: 'address-next' }));
  fireEvent.click(await screen.findByRole('button', { name: 'select-option' }));
  fireEvent.click(screen.getByRole('button', { name: 'place-order' }));
  await screen.findByRole('heading', { name: 'confirmation.title' });
  expect(revisionRequests).toEqual(['revision-1', 'revision-2']);
});

it('uses the updated shipping data after editing the selected address', async () => {
  mockFetch({ success: true });
  render(<PrintOrderContent storyId="story-1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'story-next' }));
  fireEvent.click(await screen.findByRole('button', { name: 'edit-address' }));
  fireEvent.click(screen.getByRole('button', { name: 'save-address' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'save-address' })).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'address-next' }));
  expect(await screen.findByText('Rua nova')).toBeInTheDocument();
});

it('opens the selected address for correction and accepts checkout after saving it', async () => {
  const submit = jest
    .fn()
    .mockReturnValueOnce({
      status: 400,
      json: async () => ({ success: false, code: 'shipping_address_review_required' }),
    })
    .mockReturnValueOnce({ status: 200, json: async () => ({ success: true }) });
  mockFetch({}, submit);
  await submitOrder();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'errors.shippingAddressReviewRequired',
  );
  fireEvent.click(await screen.findByRole('button', { name: 'save-address' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'address-next' }));
  expect(await screen.findByText('Rua nova')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'select-option' }));
  fireEvent.click(screen.getByRole('button', { name: 'place-order' }));

  await screen.findByRole('heading', { name: 'confirmation.title' });
  expect(submit).toHaveBeenCalledTimes(2);
});
