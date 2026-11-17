import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GuestStudio from './GuestStudio';
const translate = (key: string) => key;
jest.mock('next-intl', () => ({ useTranslations: () => translate }));
jest.mock('@/hooks/biographer/useBiographerLive', () => ({
  useBiographerLive: () => ({
    state: 'paused',
    saving: 'saved',
    error: false,
    start: jest.fn(),
    startLocalRecording: jest.fn(),
    pause: jest.fn(),
  }),
}));
jest.mock('@/hooks/biographer/useScreenAwake', () => ({ useScreenAwake: () => false }));
jest.mock('@/utils/biographer/drafts', () => ({
  answerDraft: jest.fn().mockResolvedValue(null),
  saveAnswerDraft: jest.fn().mockResolvedValue(undefined),
}));

it('saves a guest memory with no account and uses the participant-only interview endpoint', async () => {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    configurable: true,
    value: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });
  sessionStorage.setItem(
    'mythoria-biographer-guest-intent',
    JSON.stringify({
      projectId: '11111111-1111-4111-8111-111111111111',
      participantId: '22222222-2222-4222-8222-222222222222',
    }),
  );
  const detail = {
    project: { id: '11111111-1111-4111-8111-111111111111', title: 'Andrea' },
    participant: { id: '22222222-2222-4222-8222-222222222222', status: 'joined' },
    turns: [] as unknown[],
    segments: [],
    assets: [],
  };
  global.fetch = jest.fn(async (url, init) => {
    if (String(url).endsWith('/interview')) {
      const answer = JSON.parse(String(init?.body));
      detail.turns = [{ ...answer, included: true, createdAt: new Date().toISOString() }];
      return { ok: true, json: async () => ({}) } as Response;
    }
    return { ok: true, json: async () => detail } as Response;
  }) as jest.Mock;
  render(<GuestStudio />);
  await screen.findByText('Andrea');
  fireEvent.change(screen.getByLabelText('write'), {
    target: { value: 'We found a café together.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'send' }));
  await screen.findByText('We found a café together.');
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/biographer/contribution/interview',
      expect.objectContaining({ method: 'POST' }),
    ),
  );
});

it('keeps the tab bound to its participant if another tab changes the cookie', async () => {
  const projectId = '11111111-1111-4111-8111-111111111111';
  const participantId = '22222222-2222-4222-8222-222222222222';
  sessionStorage.setItem(
    'mythoria-biographer-guest-intent',
    JSON.stringify({ projectId, participantId }),
  );
  const detail = {
    project: { id: projectId, title: 'Andrea' },
    participant: { id: participantId, status: 'joined' },
    turns: [],
    segments: [],
    assets: [],
  };
  global.fetch = jest.fn(async (url, init) => {
    const headers = new Headers(init?.headers);
    expect(headers.get('x-biographer-project')).toBe(projectId);
    expect(headers.get('x-biographer-participant')).toBe(participantId);
    if (String(url).endsWith('/interview'))
      return new Response(
        JSON.stringify({
          error: 'This contribution session changed. Reopen your personal return link.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      );
    return new Response(JSON.stringify(detail), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as jest.Mock;
  render(<GuestStudio />);
  await screen.findByText('Andrea');
  fireEvent.change(screen.getByLabelText('write'), { target: { value: 'A private answer' } });
  fireEvent.click(screen.getByRole('button', { name: 'send' }));
  await screen.findByText('accessChanged');
  expect(screen.getByLabelText('write')).toHaveValue('A private answer');
});
