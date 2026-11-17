import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GuestLanding from './GuestLanding';

const replace = jest.fn();
const translate = (key: string) => key;
jest.mock('next-intl', () => ({
  useLocale: () => 'en-US',
  useTranslations: () => translate,
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

it('only claims an invitation after consent and exposes a separate private return link', async () => {
  global.fetch = jest.fn(async (_url, init) => {
    if (JSON.parse(String(init?.body)).operation === 'claim')
      return {
        ok: true,
        json: async () => ({
          resumeUrl: '/en-US/biographer/resume#private-return',
          project: { id: '11111111-1111-4111-8111-111111111111' },
          participant: { id: '22222222-2222-4222-8222-222222222222' },
        }),
      } as Response;
    return {
      ok: true,
      json: async () => ({
        project: { title: 'Andrea', subject: 'Andrea', purpose: 'Birthday' },
        participant: { name: 'Carla', relationship: 'Sister' },
      }),
    } as Response;
  }) as jest.Mock;
  render(<GuestLanding mode="invite" token="invitation-secret" />);
  await screen.findByText('Andrea');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'start' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  await screen.findByText('saveReturn');
  expect(screen.getByLabelText('returnLink')).toHaveValue(
    'http://localhost/en-US/biographer/resume#private-return',
  );
  fireEvent.click(screen.getByRole('button', { name: 'continue' }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/en-US/biographer/contribution'));
  const post = (global.fetch as jest.Mock).mock.calls.find(
    (args) => JSON.parse(String(args[1]?.body)).operation === 'claim',
  );
  expect(JSON.parse(post![1].body)).toMatchObject({
    operation: 'claim',
    input: { consent: true, name: 'Carla', relationship: 'Sister' },
  });
});
