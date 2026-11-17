import { render, screen } from '@testing-library/react';
import GuestFragmentLanding from './GuestFragmentLanding';
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('./GuestLanding', () => ({
  __esModule: true,
  default: ({ token }: { token: string }) => <p data-testid="received-token">{token}</p>,
}));
it('consumes and removes the pre-hydration token exactly once', async () => {
  const value = 'a'.repeat(43);
  const state = window as Window & { __mythoriaBiographerFragment?: string };
  state.__mythoriaBiographerFragment = value;
  render(<GuestFragmentLanding mode="invite" />);
  expect(await screen.findByTestId('received-token')).toHaveTextContent(value);
  expect(state.__mythoriaBiographerFragment).toBeUndefined();
});
