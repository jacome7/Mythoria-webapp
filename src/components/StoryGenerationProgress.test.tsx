import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import messages from '@/messages/en-US/StoryGenerationProgress.json';
import StoryGenerationProgress from './StoryGenerationProgress';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en-US' }),
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    key
      .split('.')
      .reduce<unknown>(
        (value, part) => (value as Record<string, unknown>)[part],
        messages.StoryGenerationProgress,
      ),
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: (props: ComponentProps<'a'>) => <a {...props} />,
}));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('./ThemedArtwork', () => ({ __esModule: true, default: () => null }));

const originalFetch = global.fetch;
const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

function storyResponse(story: Record<string, unknown>) {
  return { ok: true, json: async () => ({ story }) } as Response;
}

beforeEach(() => {
  global.fetch = fetchMock;
  fetchMock.mockReset().mockImplementation(async () =>
    storyResponse({
      title: 'Dragon Days',
      status: 'writing',
      storyGenerationStatus: 'running',
      storyGenerationCompletedPercentage: 5,
    }),
  );
  mockPush.mockClear();
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});

it('shows a named, determinate meter and the generation stages with a way back to My Stories', async () => {
  render(<StoryGenerationProgress storyId="story-1" storyTitle="Dragon Days" />);

  expect(
    screen.getByRole('heading', { name: 'Your story is taking shape', level: 1 }),
  ).toBeVisible();
  expect(screen.getByText('Dragon Days')).toBeVisible();
  expect(await screen.findByText('5%')).toBeVisible();
  expect(screen.getByRole('progressbar', { name: 'Book progress' })).toHaveAttribute('value', '5');
  expect(screen.getAllByRole('listitem').map((stage) => stage.textContent)).toEqual([
    'Writing',
    'Illustrating',
    'Preparing your book',
  ]);
  expect(screen.queryByRole('listitem', { current: 'step' })).toBeNull();
  expect(screen.getByText('Your story will keep generating if you leave.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Go to My Stories' })).toHaveAttribute(
    'href',
    '/en-US/my-stories',
  );
  expect(screen.queryByText(/estimated time/i)).toBeNull();
});

it.each(['failed', 'cancelled'])('shows that generation stopped when it is %s', async (status) => {
  fetchMock.mockResolvedValueOnce(
    storyResponse({ title: 'Dragon Days', status: 'writing', storyGenerationStatus: status }),
  );

  render(<StoryGenerationProgress storyId="story-1" />);

  expect(await screen.findByRole('heading', { name: 'Story generation stopped' })).toBeVisible();
  expect(screen.getByText('Dragon Days')).toBeVisible();
  expect(screen.queryByText('Your story will keep generating if you leave.')).toBeNull();
  expect(screen.getByRole('link', { name: 'Go to My Stories' })).toBeVisible();
});

it('polls every 15 seconds and stops after showing the published state', async () => {
  jest.useFakeTimers();
  const onComplete = jest.fn();
  fetchMock
    .mockResolvedValueOnce(
      storyResponse({ status: 'writing', storyGenerationCompletedPercentage: 95 }),
    )
    .mockResolvedValueOnce(
      storyResponse({ status: 'published', storyGenerationCompletedPercentage: 100 }),
    );

  render(<StoryGenerationProgress storyId="story-1" onComplete={onComplete} />);
  await act(async () => jest.advanceTimersByTimeAsync(0));

  expect(screen.getByText('95%')).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith('/api/my-stories/story-1', {
    signal: expect.any(AbortSignal),
  });

  await act(async () => jest.advanceTimersByTimeAsync(15000));

  expect(screen.getByRole('heading', { name: 'Your Story is Ready!' })).toBeVisible();
  expect(onComplete).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Read story' }));
  expect(mockPush).toHaveBeenCalledWith('/en-US/stories/read/story-1');

  await act(async () => jest.advanceTimersByTimeAsync(30000));

  expect(fetchMock).toHaveBeenCalledTimes(2);
});
