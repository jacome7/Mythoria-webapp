import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import Step5Page from './page';

const mockTrackOpenAiAdsEvent = jest.fn();
jest.mock('@/lib/openai-ads/pixel', () => ({
  trackOpenAiAdsEvent: (...args: unknown[]) => mockTrackOpenAiAdsEvent(...args),
}));
jest.mock('@clerk/nextjs', () => ({
  Show: ({ when, children }: { when: string; children: ReactNode }) =>
    when === 'signed-in' ? children : null,
  RedirectToSignIn: () => null,
  useAuth: () => ({ isSignedIn: true }),
}));
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: () => (key: string, values?: { count: number }) =>
    values ? `${key}: ${values.count}` : key,
}));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ProgressIndicator', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/StoryGenerationProgress', () => ({
  __esModule: true,
  default: ({ storyTitle }: { storyTitle?: string }) => (
    <div aria-label={storyTitle}>generation-progress</div>
  ),
}));
jest.mock('@/components/StepNavigation', () => ({
  __esModule: true,
  default: ({ onNext, nextDisabled }: { onNext?: () => void; nextDisabled?: boolean }) => (
    <button type="button" onClick={onNext} disabled={nextDisabled}>
      generate
    </button>
  ),
}));
jest.mock('@/lib/analytics', () => ({
  getGoogleAnalyticsContext: jest.fn().mockResolvedValue(undefined),
  trackStoryCreation: { stepViewed: jest.fn(), generateClicked: jest.fn() },
}));
jest.mock('@/lib/consent', () => ({ ensureConsentChoice: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/story-session', () => ({ getStep1Data: () => null }));
jest.mock('@/lib/story', () => ({
  fetchStoryData: jest.fn().mockResolvedValue({ title: 'Dragon Days' }),
}));
jest.mock('@/hooks/useStorySessionGuard', () => ({ useStorySessionGuard: () => 'story-1' }));

const originalFetch = global.fetch;

function mockFetch(
  completeBody: Record<string, unknown> = {},
  { balance = 10, cost = 5 }: { balance?: number | null; cost?: number | null } = {},
) {
  global.fetch = jest.fn(async (url: string) => {
    if (url === '/api/my-credits') {
      return { ok: balance !== null, json: async () => ({ currentBalance: balance }) };
    }
    if (url === '/api/pricing/services') {
      return {
        ok: true,
        json: async () => ({
          services:
            cost === null ? [] : [{ id: '1', name: 'eBook', cost, serviceCode: 'eBookGeneration' }],
        }),
      };
    }
    if (url === '/api/stories/complete') return { ok: true, json: async () => completeBody };
    throw new Error(`Unexpected fetch ${url}`);
  }) as unknown as typeof fetch;
}

async function generate() {
  render(<Step5Page />);
  const button = await screen.findByRole('button', { name: 'generate' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  expect(await screen.findByText('generation-progress')).toHaveAttribute(
    'aria-label',
    'Dragon Days',
  );
}

beforeEach(() => {
  mockTrackOpenAiAdsEvent.mockReset();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

it('shows the draft title, creation stages, outcomes, and live credit amounts', async () => {
  mockFetch({}, { balance: 23, cost: 7 });
  render(<Step5Page />);

  expect(
    await screen.findByRole('heading', { level: 1, name: 'confirmation.title' }),
  ).toBeVisible();
  expect(screen.getByText('Dragon Days')).toBeVisible();
  expect(screen.getByRole('heading', { level: 2, name: 'confirmation.nextHeading' })).toBeVisible();
  expect(
    screen.getByRole('heading', { level: 2, name: 'confirmation.outcomesHeading' }),
  ).toBeVisible();
  expect(screen.getAllByRole('listitem')).toHaveLength(7);
  expect(screen.getByText('confirmation.optionalAddOns')).toBeVisible();
  expect(screen.getByText('confirmation.digitalBook: 7')).toBeVisible();
  expect(screen.getByText('confirmation.balanceCredits: 23')).toBeVisible();
  expect(screen.getByRole('button', { name: 'generate' })).toBeEnabled();
});

it('shows the exact shortfall and purchase link for a confirmed low balance', async () => {
  mockFetch({}, { balance: 0, cost: 5 });
  render(<Step5Page />);

  expect(await screen.findByRole('status')).toHaveTextContent('needMoreCredits: 5');
  expect(screen.getByRole('link', { name: 'getMoreCredits' })).toHaveAttribute(
    'href',
    '/en-US/pricing#buy-credits',
  );
  expect(screen.getByRole('button', { name: 'generate' })).toBeDisabled();
});

it.each([
  [{ balance: null }, 'alerts.failedToFetchUserCredits'],
  [{ cost: null }, 'alerts.failedToFetchPricingData'],
] as const)('blocks generation when credit information is unavailable', async (options, error) => {
  mockFetch({}, options);
  render(<Step5Page />);

  expect(await screen.findByRole('alert')).toHaveTextContent(error);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'generate' })).toBeDisabled();
});
afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

it('sends lead_created with the server event id after the story is queued', async () => {
  mockFetch({ runId: 'run-1', remainingCredits: 5, adEventId: 'story_run-1' });
  await generate();

  expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledTimes(1);
  expect(mockTrackOpenAiAdsEvent).toHaveBeenCalledWith({
    eventType: 'lead_created',
    eventId: 'story_run-1',
    data: { type: 'customer_action' },
  });
});

it('does not send lead_created when the response has no adEventId', async () => {
  mockFetch({ runId: 'run-1', remainingCredits: 5 });
  await generate();

  expect(mockTrackOpenAiAdsEvent).not.toHaveBeenCalled();
});
