import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import SurveyRewardClient from './SurveyRewardClient';

const trackEventMock = jest.fn();

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ dateTime: () => 'DATE' }),
}));
jest.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
jest.mock('@/lib/analytics', () => ({
  getGoogleAnalyticsContext: jest.fn().mockResolvedValue(undefined),
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

const view = (overrides: Record<string, unknown> = {}) => ({
  entitlement: {
    entitlementId: 'ent-1',
    status: 'eligible',
    rewardType: null,
    storyId: null,
    expiresAt: '2027-01-31T23:59:59Z',
    deliveredAt: null,
    hasFailed: false,
  },
  policy: { rewardTypes: ['pdf', 'audiobook'], allowExistingAudiobook: false },
  stories: [
    {
      storyId: 'story-1',
      title: 'With audio',
      coverUri: null,
      hasAudiobook: true,
      audiobookGenerating: false,
      pdfAlreadyRedeemed: false,
    },
    {
      storyId: 'story-2',
      title: 'Fresh story',
      coverUri: null,
      hasAudiobook: false,
      audiobookGenerating: false,
      pdfAlreadyRedeemed: false,
    },
  ],
  ...overrides,
});

const respond = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);

describe('SurveyRewardClient', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('shows a not-found state when the gift is not the signed-in author’s', async () => {
    fetchMock.mockReturnValue(respond({ error: 'not_found' }, 404));
    render(<SurveyRewardClient entitlementId="ent-1" />);
    expect(await screen.findByText('notFound.title')).toBeTruthy();
  });

  it('explains the pending-story state with a link to write a story', async () => {
    fetchMock.mockReturnValue(
      respond(
        view({
          entitlement: { ...view().entitlement, status: 'pending_story' },
          stories: [],
        }),
      ),
    );
    render(<SurveyRewardClient entitlementId="ent-1" />);
    const cta = await screen.findByText('pending.cta');
    expect(cta.closest('a')?.getAttribute('href')).toBe('/tell-your-story');
  });

  it('disables stories that already have an audiobook and redeems the chosen one', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return respond({ success: true, status: 'queued' }, 202);
      return respond(view());
    });
    render(<SurveyRewardClient entitlementId="ent-1" />);

    fireEvent.click(await screen.findByLabelText(/options\.audiobook\.title/));
    const withAudio = screen.getByLabelText(/With audio/) as HTMLInputElement;
    const fresh = screen.getByLabelText(/Fresh story/) as HTMLInputElement;
    expect(withAudio.disabled).toBe(true);
    expect(fresh.disabled).toBe(false);

    fireEvent.click(fresh);
    fireEvent.click(screen.getByText('confirm'));

    expect(await screen.findByText('started.audiobookTitle')).toBeTruthy();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post?.[0]).toBe('/api/surveys/rewards/ent-1/redeem');
    expect(JSON.parse(post?.[1].body as string)).toMatchObject({
      rewardType: 'audiobook',
      storyId: 'story-2',
    });
    expect(trackEventMock).toHaveBeenCalledWith(
      'survey_reward_selected',
      expect.objectContaining({ page_path: expect.not.stringContaining('ent-1') }),
    );
    expect(trackEventMock).toHaveBeenCalledWith('survey_reward_redeemed', expect.any(Object));
  });

  it('shows a retryable error when redeeming fails', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return respond({ code: 'launch_failed' }, 502);
      return respond(view());
    });
    render(<SurveyRewardClient entitlementId="ent-1" />);

    fireEvent.click(await screen.findByLabelText(/options\.pdf\.title/));
    fireEvent.click(screen.getByLabelText(/With audio/));
    fireEvent.click(screen.getByText('confirm'));

    await waitFor(() => expect(screen.getByText('errors.launch_failed')).toBeTruthy());
    expect(screen.getByText('retry')).toBeTruthy();
    expect(trackEventMock).toHaveBeenCalledWith(
      'survey_reward_failed',
      expect.objectContaining({ error_code: 'launch_failed' }),
    );
  });
});
