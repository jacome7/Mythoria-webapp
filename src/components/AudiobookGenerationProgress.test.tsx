import { act, fireEvent, render, screen } from '@testing-library/react';
import messages from '@/messages/en-US/AudiobookGenerationProgress.json';
import AudiobookGenerationProgress from './AudiobookGenerationProgress';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    key
      .split('.')
      .reduce<unknown>(
        (value, part) => (value as Record<string, unknown>)[part],
        messages.AudiobookGenerationProgress,
      ),
}));

const originalFetch = global.fetch;
const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

function progressResponse(status: 'generating' | 'completed') {
  return { ok: true, json: async () => ({ audiobookGenerationStatus: status }) } as Response;
}

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = fetchMock.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
  global.fetch = originalFetch;
});

it('stops queued, timer and visibility checks after a 404 and permits a manual retry', async () => {
  const pending = Promise.withResolvers<Response>();
  const completed = jest.fn();
  fetchMock
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(progressResponse('generating'))
    .mockResolvedValueOnce(progressResponse('completed'));

  render(<AudiobookGenerationProgress storyId="unavailable" onComplete={completed} />);
  document.dispatchEvent(new Event('visibilitychange'));
  await act(async () => pending.resolve({ ok: false, status: 404 } as Response));
  expect(screen.getByRole('alert')).toHaveTextContent('Audiobook progress is unavailable.');
  expect(screen.queryByRole('progressbar')).toBeNull();
  await act(async () => {
    jest.advanceTimersByTime(60_000);
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
  });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByRole('progressbar')).toBeVisible();
  await act(async () => jest.advanceTimersByTimeAsync(10_000));
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(completed).toHaveBeenCalledTimes(1);
});

it('starts polling a different story and retries transient failures', async () => {
  fetchMock
    .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
    .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
    .mockResolvedValueOnce(progressResponse('completed'));
  const { rerender } = render(<AudiobookGenerationProgress storyId="removed" />);
  await screen.findByRole('alert');
  await act(async () => {
    rerender(<AudiobookGenerationProgress storyId="another-story" />);
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async () => jest.advanceTimersByTimeAsync(10_000));
  expect(fetchMock).toHaveBeenLastCalledWith(
    '/api/stories/another-story/audiobook-progress',
    expect.anything(),
  );
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(screen.queryByRole('alert')).toBeNull();
});
