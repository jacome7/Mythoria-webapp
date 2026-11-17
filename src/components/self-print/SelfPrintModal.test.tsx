import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SelfPrintModal } from './SelfPrintModal';

const mockTrackOpenAiAdsEvent = jest.fn();
jest.mock('@/lib/openai-ads/pixel', () => ({
  trackOpenAiAdsEvent: (...args: unknown[]) => mockTrackOpenAiAdsEvent(...args),
}));
jest.mock('next-intl', () => {
  const translate = Object.assign((key: string) => key, { rich: (key: string) => key });
  return { useTranslations: () => translate };
});
jest.mock('@/i18n/routing', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
jest.mock('@/lib/pricing/fetch-self-print-pricing', () => ({
  fetchSelfPrintPricing: jest.fn().mockResolvedValue({ success: true, credits: 3 }),
}));
jest.mock('@/lib/analytics', () => ({
  getGoogleAnalyticsContext: jest.fn().mockResolvedValue(undefined),
  trackPaidAction: jest.fn(),
}));

const originalFetch = global.fetch;

function mockFetch(selfPrintBody: Record<string, unknown>) {
  global.fetch = jest.fn(async (url: string) => {
    if (url === '/api/my-credits') return { ok: true, json: async () => ({ currentBalance: 10 }) };
    if (url === '/api/auth/me') return { ok: true, json: async () => ({ email: 'a@b.test' }) };
    if (url === '/api/stories/story-1/self-print') {
      return { ok: true, status: 200, json: async () => selfPrintBody };
    }
    throw new Error(`Unexpected fetch ${url}`);
  }) as unknown as typeof fetch;
}

const success = {
  success: true,
  storyId: 'story-1',
  workflowId: 'run-9',
  executionId: 'exec-1',
  creditsDeducted: 3,
  balance: { previous: 10, current: 7 },
  recipients: ['a@b.test'],
};

async function submit() {
  render(<SelfPrintModal isOpen storyId="story-1" storyTitle="Story" onClose={jest.fn()} />);
  const confirm = await screen.findByRole('button', { name: 'actions.confirm' });
  await waitFor(() => expect(confirm).toBeEnabled());
  fireEvent.click(confirm);
  await waitFor(() =>
    expect(
      (global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).endsWith('/self-print')),
    ).toBe(true),
  );
}

beforeEach(() => mockTrackOpenAiAdsEvent.mockReset());
afterEach(() => {
  global.fetch = originalFetch;
});

it('sends self_print_requested with the server event id on success', async () => {
  mockFetch({ ...success, adEventId: 'self_print_run-9' });
  await submit();

  await waitFor(() => expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledTimes(1));
  expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledWith({
    eventType: 'custom',
    customEventName: 'self_print_requested',
    eventId: 'self_print_run-9',
    data: {
      type: 'custom',
      contents: [
        { id: 'self_print', name: 'Self-print PDF', content_type: 'service', quantity: 1 },
      ],
    },
  });
});

it('does not send self_print_requested without a server event id', async () => {
  mockFetch(success);
  await submit();

  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'actions.confirm' })).not.toBeInTheDocument(),
  );
  expect(mockTrackOpenAiAdsEvent).not.toHaveBeenCalled();
});
