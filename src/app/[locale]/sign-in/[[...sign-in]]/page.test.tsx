/** @jest-environment node */
import SignInPage from './page';

const mockRedirect = jest.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const mockGetLead = jest.fn();
const mockIsFirst = jest.fn();
const mockUpdateLead = jest.fn();
jest.mock('next-intl/server', () => ({ setRequestLocale: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: (url: string) => mockRedirect(url) }));
jest.mock('./SignInClient', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/lead-session', () => ({
  getLeadSession: () => mockGetLead(),
  isFirstLeadAccess: () => mockIsFirst(),
  updateLeadSession: (value: unknown) => mockUpdateLead(value),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLead.mockResolvedValue({ leadId: 'test-lead', language: 'en-US' });
  mockIsFirst.mockResolvedValue(true);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());
it.each(['redirect', 'redirectUrl'])(
  'preserves a package through first-lead signup using %s',
  async (key) => {
    await expect(
      SignInPage({
        params: Promise.resolve({ locale: 'pt-PT' }),
        searchParams: Promise.resolve({ [key]: '/pt-PT/buy-credits?package=2', ref: 'partner' }),
      }),
    ).rejects.toThrow('REDIRECT:');
    const entry = new URL(mockRedirect.mock.calls[0][0], 'https://mythoria.pt');
    expect(entry.pathname).toBe('/en-US/sign-up');
    const target = new URL(entry.searchParams.get('redirect')!, 'https://mythoria.pt');
    expect(target.pathname).toBe('/pt-PT/buy-credits');
    expect(target.searchParams.get('package')).toBe('2');
    expect(target.searchParams.get('ref')).toBe('partner');
    expect(mockUpdateLead).not.toHaveBeenCalled();
  },
);
it('rejects an external lead return target', async () => {
  await expect(
    SignInPage({
      params: Promise.resolve({ locale: 'pt-PT' }),
      searchParams: Promise.resolve({ redirect: '//evil.example' }),
    }),
  ).rejects.toThrow('REDIRECT:');
  const entry = new URL(mockRedirect.mock.calls[0][0], 'https://mythoria.pt');
  expect(entry.searchParams.get('redirect')).toMatch(/^\/en-US\/profile\/onboarding/);
});
it('lets a returning lead use sign in normally', async () => {
  mockIsFirst.mockResolvedValue(false);
  await SignInPage({
    params: Promise.resolve({ locale: 'pt-PT' }),
    searchParams: Promise.resolve({ redirect: '/pt-PT/buy-credits?package=2' }),
  });
  expect(mockRedirect).not.toHaveBeenCalled();
  expect(mockUpdateLead).not.toHaveBeenCalled();
});

it('allows a first lead to return explicitly from signup to login with the package intact', async () => {
  const result = await SignInPage({
    params: Promise.resolve({ locale: 'pt-PT' }),
    searchParams: Promise.resolve({
      redirect: '/pt-PT/buy-credits?package=2',
      auth_mode: 'sign-in',
    }),
  });
  expect(result.props.locale).toBe('pt-PT');
  expect(mockRedirect).not.toHaveBeenCalled();
  expect(mockUpdateLead).not.toHaveBeenCalled();
});
