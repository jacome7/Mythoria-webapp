import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PeopleMemories from './PeopleMemories';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
const person = {
  id: 'person-1',
  name: 'Carla',
  relationship: 'sister',
  status: 'started',
  responseCount: 3,
  recordedSeconds: 120,
  wordCount: 120,
  photoCount: 1,
  newMaterial: true,
  reviewed: false,
  contributionRevision: 4,
};
const detail = {
  participant: person,
  turns: [
    {
      id: 'turn-1',
      text: 'The café in Andorra',
      role: 'user',
      included: true,
      createdAt: '2026-11-17T12:00:00Z',
    },
  ],
  segments: [],
  assets: [],
};

it('shows contribution metrics and reviews the exact displayed revision', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  global.fetch = jest.fn(async (url, init) => {
    calls.push({ url: String(url), init });
    if (init?.method === 'PATCH') return { ok: true, json: async () => ({ ok: true }) } as Response;
    if (String(url).endsWith('/person-1'))
      return { ok: true, json: async () => detail } as Response;
    return { ok: true, json: async () => ({ contributors: [person] }) } as Response;
  }) as jest.Mock;
  render(<PeopleMemories projectId="project-1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Carla' }));
  await screen.findByText('The café in Andorra');
  fireEvent.click(screen.getByRole('button', { name: 'markReviewed' }));
  await waitFor(() => {
    const review = calls.find((call) => call.init?.method === 'PATCH');
    expect(JSON.parse(String(review?.init?.body))).toEqual({ action: 'review', revision: 4 });
  });
});

it('creates a named invitation rather than marking it delivered', async () => {
  global.fetch = jest.fn(async (_url, init) => {
    if (init?.method === 'POST')
      return {
        ok: true,
        json: async () => ({ inviteUrl: '/en-US/biographer/invite#secret' }),
      } as Response;
    return { ok: true, json: async () => ({ contributors: [] }) } as Response;
  }) as jest.Mock;
  render(<PeopleMemories projectId="project-1" />);
  fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Carla' } });
  fireEvent.click(screen.getByRole('button', { name: 'createInvite' }));
  await screen.findByLabelText('link');
  expect(screen.getByLabelText('link')).toHaveValue(
    'http://localhost/en-US/biographer/invite#secret',
  );
  expect(global.fetch).toHaveBeenCalledWith(
    '/api/biographer/projects/project-1/contributors',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Carla', relationship: '' }),
    }),
  );
});
