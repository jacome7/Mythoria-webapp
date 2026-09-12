import { render, screen, waitFor, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import Header from './Header';

let mockSignedIn = true;
jest.mock('@clerk/nextjs', () => {
  const Wrapper = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    useUser: () => ({
      isLoaded: true,
      isSignedIn: mockSignedIn,
      user: mockSignedIn ? { id: 'user-1' } : null,
    }),
    UserButton: Object.assign(Wrapper, {
      MenuItems: Wrapper,
      Link: ({ label, href }: { label: string; href: string }) => <a href={href}>{label}</a>,
      Action: () => null,
    }),
  };
});
jest.mock('next-intl', () => ({
  useLocale: () => 'pt-PT',
  useTranslations: () => (key: string) => key,
}));
jest.mock('./Header.module.css', () => ({}));
jest.mock('./LanguageSwitcher', () => () => null);
jest.mock('next/image', () => () => null);
jest.mock(
  './landing-pages/LandingCreationLink',
  () =>
    function MockLandingCreationLink({ children }: { children: ReactNode }) {
      return <span>{children}</span>;
    },
);

const originalFetch = global.fetch;
const mockFetch = jest.fn();
beforeEach(() => {
  mockSignedIn = true;
  mockFetch.mockReset();
  global.fetch = mockFetch;
});
afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
});

it('adds the localized portal link for an eligible referral owner', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ hasAccess: true }) });
  render(<Header />);
  expect(await screen.findByRole('link', { name: 'navigation.referrals' })).toHaveAttribute(
    'href',
    '/pt-PT/referrals',
  );
});

it.each([false, null])(
  'hides the portal link for a non-owner or failed access check (%s)',
  async (hasAccess) => {
    mockFetch.mockResolvedValue({ ok: hasAccess !== null, json: async () => ({ hasAccess }) });
    render(<Header />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: 'navigation.referrals' })).not.toBeInTheDocument();
  },
);

it('does not request membership for anonymous visitors', () => {
  mockSignedIn = false;
  render(<Header />);
  expect(mockFetch).not.toHaveBeenCalled();
  expect(screen.queryByRole('link', { name: 'navigation.referrals' })).not.toBeInTheDocument();
});
