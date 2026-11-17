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
  useTranslations: () => (key: string) => key,
}));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ProgressIndicator', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/StoryGenerationProgress', () => ({
  __esModule: true,
  default: () => <div>generation-progress</div>,
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

function mockFetch(completeBody: Record<string, unknown>) {
  global.fetch = jest.fn(async (url: string) => {
    if (url === '/api/my-credits') return { ok: true, json: async () => ({ currentBalance: 10 }) };
    if (url === '/api/pricing/services?storyId=story-1') {
      return {
        ok: true,
        json: async () => ({
          services: [{ id: '1', name: 'eBook', cost: 5, serviceCode: 'eBookGeneration' }],
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
  await screen.findByText('generation-progress');
}

beforeEach(() => {
  mockTrackOpenAiAdsEvent.mockReset();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
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
