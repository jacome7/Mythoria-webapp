import { render, screen } from '@testing-library/react';
import PublicPremiumBookPage from '../../p/[slug]/PublicPremiumBookPage';
import SharedStoryPageClient from './SharedStoryPageClient';

const storyId = '00000000-0000-4000-8000-000000000001';
const router = { push: jest.fn() };
const search = new URLSearchParams('utm_campaign=story_share');
const translate = (key: string) => key;
const originalFetch = global.fetch;
const mockFetch = jest.fn();

function response(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

jest.mock('next/navigation', () => ({
  useParams: () => ({ token: 'view-token' }),
  useRouter: () => router,
  useSearchParams: () => search,
}));
jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: () => translate,
}));
jest.mock('@/i18n/routing', () => ({ Link: () => null }));
jest.mock(
  '@/components/PremiumBookReader',
  () =>
    function MockPremiumBookReader() {
      return <p>Premium reader</p>;
    },
);
jest.mock('@/components/PublicStoryRating', () => () => null);
jest.mock(
  '@/components/QualifiedShareOpen',
  () =>
    function MockQualifiedShareOpen({
      publicSlug,
      storyId,
    }: {
      publicSlug?: string;
      storyId?: string;
    }) {
      return <p>Observe {publicSlug ?? storyId}</p>;
    },
);

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

it('measures a public share only after the premium reader loads', async () => {
  mockFetch.mockResolvedValueOnce(
    response({
      premiumBook: {},
      story: { storyId },
      canPrint: false,
    }),
  );
  render(<PublicPremiumBookPage slug="premium-book" />);
  expect(screen.queryByText('Observe premium-book')).not.toBeInTheDocument();
  expect(await screen.findByText('Observe premium-book')).toBeInTheDocument();
  expect(screen.getByText('Premium reader')).toBeInTheDocument();
});

it('measures the successfully authorized private premium reader', async () => {
  mockFetch.mockResolvedValueOnce(response({ success: true, storyId, premiumBook: {} }));
  render(<SharedStoryPageClient />);
  expect(await screen.findByText(`Observe ${storyId}`)).toBeInTheDocument();
  expect(mockFetch).toHaveBeenCalledWith(
    '/api/share/view-token?utm_campaign=story_share',
    expect.objectContaining({ cache: 'no-store' }),
  );
});

it('plays and downloads the complete MP3 from the signed-in share route', async () => {
  const runId = 'd65bb5f3-204a-479d-b4df-9ee71f6c513e';
  mockFetch.mockResolvedValueOnce(
    response({
      success: true,
      storyId,
      premiumBook: {},
      premiumAudio: { runId, duration: 55 },
    }),
  );
  render(<SharedStoryPageClient />);
  const audioUrl = `/api/share/view-token/audio/0?runId=${runId}`;
  expect(await screen.findByLabelText('fullAudiobook')).toHaveAttribute('src', audioUrl);
  expect(screen.getByText('listen.controls.download')).toHaveAttribute(
    'href',
    `${audioUrl}&download=1`,
  );
});

it('does not observe when the private link is revoked', async () => {
  mockFetch.mockResolvedValueOnce(response({ error: 'Revoked' }, false));
  render(<SharedStoryPageClient />);
  expect(await screen.findByText('Revoked')).toBeInTheDocument();
  expect(screen.queryByText(/^Observe /)).not.toBeInTheDocument();
});
