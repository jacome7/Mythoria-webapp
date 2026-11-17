import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BiographerStudio from './BiographerStudio';

jest.mock('@clerk/nextjs', () => ({ useAuth: () => ({ userId: 'author-1' }) }));
jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: () => (key: string) => key,
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
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

it('saves an answer and reviews photographs through the private project endpoint', async () => {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    configurable: true,
    value: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });
  const project = {
    project: { title: 'A family story', revision: 0, proposal: null },
    participant: { id: 'participant' },
    turns: [] as unknown[],
    segments: [],
    assets: [{ id: 'photo-1', caption: 'Andorra', included: true }],
  };
  global.fetch = jest.fn(async (_url, init) => {
    if (String(_url).endsWith('/interview')) {
      const answer = JSON.parse(String(init?.body));
      project.turns = [{ ...answer, included: true, createdAt: new Date().toISOString() }];
      return { ok: true, json: async () => ({}) } as Response;
    }
    return { ok: true, json: async () => project } as Response;
  }) as jest.Mock;
  render(<BiographerStudio projectId="project-1" collaborationEnabled={false} />);
  await screen.findByText('A family story');
  fireEvent.change(screen.getByLabelText('write'), {
    target: { value: 'A little café in Andorra' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'send' }));
  await screen.findByText('A little café in Andorra');
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/biographer/projects/project-1/interview',
      expect.objectContaining({ method: 'POST' }),
    ),
  );
  fireEvent.click(screen.getByRole('tab', { name: 'memories' }));
  expect(screen.getByAltText('Andorra')).toHaveAttribute(
    'src',
    '/api/biographer/projects/project-1/photos/photo-1',
  );
  expect(screen.queryByRole('tab', { name: 'peopleTab' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'book' }));
  await screen.findByText('bookHelp');
  expect(global.fetch).not.toHaveBeenCalledWith(
    '/api/biographer/projects/project-1/contributors',
    expect.anything(),
  );
});

it('keeps an uploaded photo and retries its question with the same response identity', async () => {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    configurable: true,
    value: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });
  const detail = {
    project: { title: 'A family story', revision: 0, proposal: null },
    participant: { id: 'participant' },
    turns: [],
    segments: [],
    assets: [],
  };
  const interviewBodies: Array<{ id: string; text: string }> = [];
  global.fetch = jest.fn(async (url, init) => {
    if (String(url).endsWith('/contributors'))
      return { ok: true, json: async () => ({ contributors: [] }) } as Response;
    if (String(url).endsWith('/photos') && init?.method === 'POST')
      return { ok: true, json: async () => ({}) } as Response;
    if (String(url).endsWith('/interview')) {
      interviewBodies.push(JSON.parse(String(init?.body)));
      return { ok: interviewBodies.length > 1, json: async () => ({}) } as Response;
    }
    return { ok: true, json: async () => detail } as Response;
  }) as jest.Mock;
  render(<BiographerStudio projectId="project-1" collaborationEnabled />);
  await screen.findByText('A family story');
  fireEvent.change(screen.getByLabelText('photoCaption'), { target: { value: 'Andorra holiday' } });
  fireEvent.change(screen.getByLabelText('addPhoto'), {
    target: { files: [new File(['picture'], 'photo.png', { type: 'image/png' })] },
  });
  const retry = await screen.findByRole('button', { name: 'retryPhotoQuestion' });
  await waitFor(() => expect(retry).toBeEnabled());
  fireEvent.click(retry);
  await waitFor(() => expect(interviewBodies).toHaveLength(2));
  expect(interviewBodies[0]).toEqual(interviewBodies[1]);
  expect(interviewBodies[0].text).toContain('Andorra holiday');
  expect(screen.getByRole('tab', { name: 'peopleTab' })).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalledWith(
    '/api/biographer/projects/project-1/contributors',
    expect.anything(),
  );
  fireEvent.click(screen.getByRole('tab', { name: 'book' }));
  expect(global.fetch).toHaveBeenCalledWith('/api/biographer/projects/project-1/contributors', {
    cache: 'no-store',
  });
});
